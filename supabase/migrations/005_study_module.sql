-- =========================================================
-- Duo Todo — Study module (subjects → topics → subtopics → revisions)
-- Each user owns a private hierarchy; the partner only ever sees
-- aggregate stats exposed through the SECURITY DEFINER RPCs below.
-- Apply in the Supabase SQL editor AFTER 001-004.
-- =========================================================

-- ---------- subjects ----------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  color text not null default '#8B7CFF',
  target_date date,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subjects_user_position on public.subjects(user_id, position);

-- ---------- topics ----------
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists topics_subject_position on public.topics(subject_id, position);

-- ---------- subtopics ----------
-- status: 'not_started' → 'studied' (studied at least once, via complete_revision)
create table if not exists public.subtopics (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  status text not null default 'not_started' check (status in ('not_started','studied')),
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  notes text not null default '',
  resource_url text,
  revision_count int not null default 0,
  last_revised_at timestamptz,
  next_due_at date,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subtopics_topic_position on public.subtopics(topic_id, position);
create index if not exists subtopics_due on public.subtopics(next_due_at) where next_due_at is not null;

-- ---------- revision_history ----------
-- revision_number 0 = first study, 1..n = later revisions
create table if not exists public.revision_history (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision_number int not null,
  revised_at timestamptz not null default now(),
  unique (subtopic_id, revision_number)
);
create index if not exists revision_history_subtopic on public.revision_history(subtopic_id, revision_number);
create index if not exists revision_history_user_time on public.revision_history(user_id, revised_at desc);

-- ---------- study_sessions ----------
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  duration_minutes int not null default 0 check (duration_minutes >= 0),
  created_at timestamptz not null default now()
);
create index if not exists study_sessions_user_time on public.study_sessions(user_id, created_at desc);

-- =========================================================
-- Row Level Security — study data is strictly private.
-- =========================================================
alter table public.subjects        enable row level security;
alter table public.topics          enable row level security;
alter table public.subtopics       enable row level security;
alter table public.revision_history enable row level security;
alter table public.study_sessions  enable row level security;

drop policy if exists p_subjects_select on public.subjects;
create policy p_subjects_select on public.subjects for select using (user_id = auth.uid());
drop policy if exists p_subjects_write on public.subjects;
create policy p_subjects_write on public.subjects for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_topics_select on public.topics;
create policy p_topics_select on public.topics for select using (
  exists (select 1 from public.subjects s where s.id = topics.subject_id and s.user_id = auth.uid())
);
drop policy if exists p_topics_write on public.topics;
create policy p_topics_write on public.topics for all using (
  exists (select 1 from public.subjects s where s.id = topics.subject_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.subjects s where s.id = topics.subject_id and s.user_id = auth.uid())
);

drop policy if exists p_subtopics_select on public.subtopics;
create policy p_subtopics_select on public.subtopics for select using (
  exists (
    select 1 from public.topics t
    join public.subjects s on s.id = t.subject_id
    where t.id = subtopics.topic_id and s.user_id = auth.uid()
  )
);
drop policy if exists p_subtopics_write on public.subtopics;
create policy p_subtopics_write on public.subtopics for all using (
  exists (
    select 1 from public.topics t
    join public.subjects s on s.id = t.subject_id
    where t.id = subtopics.topic_id and s.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.topics t
    join public.subjects s on s.id = t.subject_id
    where t.id = subtopics.topic_id and s.user_id = auth.uid()
  )
);

drop policy if exists p_rh_select on public.revision_history;
create policy p_rh_select on public.revision_history for select using (user_id = auth.uid());
drop policy if exists p_rh_write on public.revision_history;
create policy p_rh_write on public.revision_history for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_ss_select on public.study_sessions;
create policy p_ss_select on public.study_sessions for select using (user_id = auth.uid());
drop policy if exists p_ss_write on public.study_sessions;
create policy p_ss_write on public.study_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================
-- complete_revision — one atomic "Mark studied / Mark Revision Complete".
-- 1. flips status to studied (first call) or bumps revision_count
-- 2. appends a revision_history row (0 = first study, then 1..n)
-- 3. stamps last_revised_at and schedules next_due_at with spaced
--    repetition intervals: 1d, 3d, 7d, then 14d forever
-- =========================================================
create or replace function public.complete_revision(_subtopic_id uuid)
returns public.subtopics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subtopics%rowtype;
  v_owner uuid;
  v_is_first boolean;
  v_new_count int;
  v_stage int;
  v_interval_days int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select s.*, sub.user_id
  into v_sub, v_owner
  from public.subtopics s
    join public.topics t on t.id = s.topic_id
    join public.subjects sub on sub.id = t.subject_id
  where s.id = _subtopic_id
  for update of s;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'subtopic not found';
  end if;

  v_is_first := v_sub.status = 'not_started';
  if v_is_first then
    v_new_count := 0;
  else
    v_new_count := v_sub.revision_count + 1;
  end if;

  v_stage := v_new_count + 1;
  v_interval_days := case
    when v_stage <= 1 then 1
    when v_stage = 2 then 3
    when v_stage = 3 then 7
    else 14
  end;

  update public.subtopics set
    status = 'studied',
    revision_count = v_new_count,
    last_revised_at = now(),
    next_due_at = (current_date + v_interval_days),
    updated_at = now()
  where id = _subtopic_id
  returning * into v_sub;

  insert into public.revision_history (subtopic_id, user_id, revision_number, revised_at)
  values (_subtopic_id, auth.uid(), case when v_is_first then 0 else v_new_count end, now());

  return v_sub;
end;
$$;

revoke all on function public.complete_revision(uuid) from public;
grant execute on function public.complete_revision(uuid) to authenticated;

-- =========================================================
-- get_duo_study_overview — the ONLY cross-user window into study data:
-- aggregate per-member stats + per-subject progress for the Together page.
-- =========================================================
create or replace function public.get_duo_study_overview()
returns table (
  user_id uuid,
  display_name text,
  accent_color text,
  study_completion int,
  revision_completion int,
  topics_studied bigint,
  total_subtopics bigint,
  total_revisions bigint,
  revisions_today bigint,
  subjects jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    p.accent_color,
    coalesce(st.study_completion, 0)::int,
    coalesce(st.revision_completion, 0)::int,
    coalesce(ts.topics_studied, 0),
    coalesce(st.total_subtopics, 0),
    coalesce(tr.total_revisions, 0),
    coalesce(rt.revisions_today, 0),
    coalesce(sj.subjects, '[]'::jsonb)
  from public.profiles p
  join public.duo_members m
    on m.user_id = p.id and m.active = true
   and m.duo_id = (
      select duo_id from public.duo_members
      where user_id = auth.uid() and active = true
      limit 1
   )
  join lateral (
    select
      round(100.0 * count(*) filter (where s.status = 'studied') / greatest(count(*), 1))::int as study_completion,
      round(100.0 * count(*) filter (where s.status = 'studied' and (s.next_due_at is null or s.next_due_at >= current_date))
            / greatest(count(*) filter (where s.status = 'studied'), 1))::int as revision_completion,
      count(*) as total_subtopics
    from public.subtopics s
      join public.topics t on t.id = s.topic_id
      join public.subjects sub on sub.id = t.subject_id
    where sub.user_id = p.id
  ) st on true
  join lateral (
    select count(*) as topics_studied
    from public.topics t
      join public.subjects sub on sub.id = t.subject_id
    where sub.user_id = p.id
      and exists (select 1 from public.subtopics s where s.topic_id = t.id and s.status = 'studied')
      and not exists (select 1 from public.subtopics s where s.topic_id = t.id and s.status <> 'studied')
  ) ts on true
  join lateral (
    select count(*) as total_revisions
    from public.revision_history rh
    where rh.user_id = p.id
  ) tr on true
  join lateral (
    select count(*) as revisions_today
    from public.revision_history rh
    where rh.user_id = p.id and rh.revised_at::date = current_date
  ) rt on true
  join lateral (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', x.name, 'color', x.color, 'studied', x.studied, 'total', x.total, 'pct', x.pct
    ) order by x.position), '[]'::jsonb) as subjects
    from (
      select sub.name, sub.color, sub.position,
        count(s.id) as total,
        count(s.id) filter (where s.status = 'studied') as studied,
        round(100.0 * count(s.id) filter (where s.status = 'studied') / greatest(count(s.id), 1))::int as pct
      from public.subjects sub
        left join public.topics t on t.subject_id = sub.id
        left join public.subtopics s on s.topic_id = t.id
      where sub.user_id = p.id
      group by sub.id, sub.name, sub.color, sub.position
      order by sub.position
    ) x
  ) sj on true;
$$;

revoke all on function public.get_duo_study_overview() from public;
grant execute on function public.get_duo_study_overview() to authenticated;

-- =========================================================
-- get_duo_weekly_study — per-day revision counts for both members,
-- last 7 days (aggregates only; feeds the Insights weekly report).
-- =========================================================
create or replace function public.get_duo_weekly_study()
returns table (
  user_id uuid,
  day date,
  revisions bigint,
  first_studies bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select rh.user_id, rh.revised_at::date as day,
    count(*) as revisions,
    count(*) filter (where rh.revision_number = 0) as first_studies
  from public.revision_history rh
  where rh.revised_at >= (current_date - interval '6 days')
    and rh.user_id in (
      select m.user_id from public.duo_members m
      where m.duo_id = (
        select duo_id from public.duo_members
        where user_id = auth.uid() and active = true
        limit 1
      ) and m.active = true
    )
  group by rh.user_id, rh.revised_at::date;
$$;

revoke all on function public.get_duo_weekly_study() from public;
grant execute on function public.get_duo_weekly_study() to authenticated;

-- =========================================================
-- Realtime — keep the owner's own study views live across tabs.
-- postgres_changes is RLS-scoped, so partners never receive these rows.
-- =========================================================
do $$ begin
  alter publication supabase_realtime add table public.subjects;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.topics;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.subtopics;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.revision_history;
exception when duplicate_object then null; end $$;
