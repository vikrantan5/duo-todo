-- =========================================================
-- Duo Todo — initial schema
-- Apply with: supabase db push  OR  paste into Supabase SQL editor.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  accent_color text not null default '#8B7CFF',
  timezone text not null default 'UTC',
  theme_preference text not null default 'dark' check (theme_preference in ('dark','light')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- duos ----------
create table if not exists public.duos (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Duo',
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- duo_members ----------
create table if not exists public.duo_members (
  duo_id uuid not null references public.duos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (duo_id, user_id)
);
-- A user can be an active member of at most one duo (platform rule).
create unique index if not exists duo_members_one_active_per_user
  on public.duo_members(user_id) where active;

-- Enforce "max 2 active members per duo"
create or replace function public.enforce_duo_member_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare current_count int;
begin
  if NEW.active then
    select count(*) into current_count from public.duo_members where duo_id = NEW.duo_id and active = true;
    if (TG_OP = 'INSERT' and current_count >= 2)
       or (TG_OP = 'UPDATE' and current_count > 2) then
      raise exception 'Duo is full (max 2 active members)';
    end if;
  end if;
  return NEW;
end$$;

drop trigger if exists trg_duo_member_cap on public.duo_members;
create trigger trg_duo_member_cap
  before insert or update on public.duo_members
  for each row execute function public.enforce_duo_member_cap();

-- Membership helper used by RLS
create or replace function public.is_duo_member(_duo uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.duo_members
    where duo_id = _duo and user_id = _user and active = true
  );
$$;

-- ---------- duo_invitations ----------
create table if not exists public.duo_invitations (
  id uuid primary key default gen_random_uuid(),
  duo_id uuid not null references public.duos(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists duo_invitations_duo on public.duo_invitations(duo_id);

-- ---------- todos ----------
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  duo_id uuid not null references public.duos(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text,
  category text,
  custom_category text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_time time,
  duration_minutes int,
  position int not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  recurring_rule jsonb,
  source_todo_id uuid references public.todos(id) on delete set null,
  date_key date not null default (current_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists todos_duo_date on public.todos(duo_id, date_key);
create index if not exists todos_owner_date on public.todos(owner_id, date_key);
create index if not exists todos_order on public.todos(duo_id, owner_id, date_key, position);

-- Owner must be an active member of the duo
create or replace function public.todos_check_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_duo_member(NEW.duo_id, NEW.owner_id) then
    raise exception 'owner is not an active member of this duo';
  end if;
  return NEW;
end$$;
drop trigger if exists trg_todos_check_owner on public.todos;
create trigger trg_todos_check_owner
  before insert or update on public.todos
  for each row execute function public.todos_check_owner();

-- ---------- todo_subtasks ----------
create table if not exists public.todo_subtasks (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists subtasks_todo on public.todo_subtasks(todo_id);

-- ---------- day_reflections ----------
create table if not exists public.day_reflections (
  id uuid primary key default gen_random_uuid(),
  duo_id uuid not null references public.duos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  reflection_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date_key)
);

-- ---------- daily_targets ----------
create table if not exists public.daily_targets (
  id uuid primary key default gen_random_uuid(),
  duo_id uuid not null references public.duos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  target_percentage int not null default 70 check (target_percentage between 0 and 100),
  unique (user_id, date_key)
);

-- ---------- reactions ----------
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  duo_id uuid not null references public.duos(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  todo_id uuid references public.todos(id) on delete set null,
  date_key date not null default current_date,
  emoji text not null,
  message text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reactions_to on public.reactions(to_user_id, created_at desc);

-- ---------- user_stats ----------
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_qualifying_day date,
  updated_at timestamptz not null default now()
);

-- ---------- achievements ----------
create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text
);
insert into public.achievements(id,name,description,icon) values
  ('seven_day_streak','7-Day Streak','Hit your target 7 days in a row','flame'),
  ('early_bird','Early Bird','Complete 3 tasks before 9am','sun'),
  ('perfect_week','Perfect Week','100% completion all week','star'),
  ('comeback_kid','Comeback Kid','Rebuild a streak after missing','heart')
on conflict (id) do nothing;

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------- focus_sessions ----------
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  duo_id uuid not null references public.duos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  todo_id uuid references public.todos(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_duration_minutes int not null default 25,
  status text not null default 'running' check (status in ('running','completed','cancelled'))
);

-- ---------- profile auto-create trigger ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (NEW.id, coalesce(NEW.raw_user_meta_data->>'display_name',''), coalesce(NEW.raw_user_meta_data->>'timezone','UTC'))
  on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (NEW.id)
  on conflict (user_id) do nothing;
  return NEW;
end$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Secure invitation acceptance (SECURITY DEFINER)
-- =========================================================
create or replace function public.accept_invitation(_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare inv public.duo_invitations; uid uuid; current_members int;
begin
  uid := auth.uid();
  if uid is null then raise exception 'not authenticated'; end if;

  select * into inv from public.duo_invitations
    where token_hash = _token_hash
      and accepted_by is null
      and revoked_at is null
      and expires_at > now()
    for update;
  if inv.id is null then raise exception 'invitation invalid or expired'; end if;

  if inv.created_by = uid then raise exception 'cannot accept your own invite'; end if;
  if exists (select 1 from public.duo_members where user_id = uid and active = true)
    then raise exception 'you already belong to a duo'; end if;

  select count(*) into current_members from public.duo_members
    where duo_id = inv.duo_id and active = true;
  if current_members >= 2 then raise exception 'duo is full'; end if;

  insert into public.duo_members(duo_id, user_id, role) values (inv.duo_id, uid, 'member');

  update public.duo_invitations
    set accepted_by = uid, accepted_at = now()
    where id = inv.id;

  return inv.duo_id;
end$$;

-- =========================================================
-- XP award (idempotent per todo completion)
-- =========================================================
create table if not exists public.xp_ledger (
  todo_id uuid primary key references public.todos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  awarded_xp int not null,
  created_at timestamptz not null default now()
);

create or replace function public.award_xp_for_todo(_todo uuid)
returns int language plpgsql security definer set search_path = public as $$
declare t public.todos; xp int; uid uuid;
begin
  uid := auth.uid();
  select * into t from public.todos where id = _todo;
  if t.id is null then raise exception 'todo not found'; end if;
  if t.owner_id <> uid then raise exception 'not your todo'; end if;
  if not t.is_completed then return 0; end if;

  xp := case t.priority when 'low' then 10 when 'medium' then 15 else 20 end;

  insert into public.xp_ledger(todo_id, user_id, awarded_xp) values (_todo, uid, xp)
  on conflict (todo_id) do nothing;

  update public.user_stats set total_xp = total_xp + xp, updated_at = now()
    where user_id = uid
    and not exists (select 1 from public.xp_ledger where todo_id = _todo and awarded_xp <> xp);

  return xp;
end$$;
