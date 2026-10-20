-- =========================================================
-- Duo Todo — Row Level Security policies
-- =========================================================

alter table public.profiles          enable row level security;
alter table public.duos              enable row level security;
alter table public.duo_members       enable row level security;
alter table public.duo_invitations   enable row level security;
alter table public.todos             enable row level security;
alter table public.todo_subtasks     enable row level security;
alter table public.day_reflections   enable row level security;
alter table public.daily_targets     enable row level security;
alter table public.reactions         enable row level security;
alter table public.user_stats        enable row level security;
alter table public.user_achievements enable row level security;
alter table public.focus_sessions    enable row level security;
alter table public.achievements      enable row level security;
alter table public.xp_ledger         enable row level security;

-- profiles: a user sees themselves + their partner
drop policy if exists p_profiles_select on public.profiles;
create policy p_profiles_select on public.profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from public.duo_members m1
    join public.duo_members m2 on m1.duo_id = m2.duo_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.id and m1.active and m2.active
  )
);
drop policy if exists p_profiles_update on public.profiles;
create policy p_profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists p_profiles_insert on public.profiles;
create policy p_profiles_insert on public.profiles for insert with check (id = auth.uid());

-- duos: visible to members; creation handled by API/action
drop policy if exists p_duos_select on public.duos;
create policy p_duos_select on public.duos for select
  using (public.is_duo_member(id, auth.uid()));
drop policy if exists p_duos_insert on public.duos;
create policy p_duos_insert on public.duos for insert with check (created_by = auth.uid());
drop policy if exists p_duos_update on public.duos;
create policy p_duos_update on public.duos for update
  using (public.is_duo_member(id, auth.uid())) with check (public.is_duo_member(id, auth.uid()));

-- duo_members
drop policy if exists p_dm_select on public.duo_members;
create policy p_dm_select on public.duo_members for select
  using (user_id = auth.uid() or public.is_duo_member(duo_id, auth.uid()));
drop policy if exists p_dm_insert on public.duo_members;
create policy p_dm_insert on public.duo_members for insert
  with check (user_id = auth.uid()); -- only self-join; invite flow uses SECURITY DEFINER function
drop policy if exists p_dm_update on public.duo_members;
create policy p_dm_update on public.duo_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- duo_invitations
drop policy if exists p_inv_select on public.duo_invitations;
create policy p_inv_select on public.duo_invitations for select
  using (created_by = auth.uid() or public.is_duo_member(duo_id, auth.uid()));
drop policy if exists p_inv_insert on public.duo_invitations;
create policy p_inv_insert on public.duo_invitations for insert
  with check (created_by = auth.uid() and public.is_duo_member(duo_id, auth.uid()));
drop policy if exists p_inv_update on public.duo_invitations;
create policy p_inv_update on public.duo_invitations for update
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- todos: read by any duo member; write only by owner
drop policy if exists p_todos_select on public.todos;
create policy p_todos_select on public.todos for select
  using (public.is_duo_member(duo_id, auth.uid()));
drop policy if exists p_todos_insert on public.todos;
create policy p_todos_insert on public.todos for insert
  with check (owner_id = auth.uid() and public.is_duo_member(duo_id, auth.uid()));
drop policy if exists p_todos_update on public.todos;
create policy p_todos_update on public.todos for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists p_todos_delete on public.todos;
create policy p_todos_delete on public.todos for delete using (owner_id = auth.uid());

-- subtasks follow parent todo authorization
drop policy if exists p_sub_select on public.todo_subtasks;
create policy p_sub_select on public.todo_subtasks for select using (
  exists (select 1 from public.todos t where t.id = todo_id and public.is_duo_member(t.duo_id, auth.uid()))
);
drop policy if exists p_sub_write on public.todo_subtasks;
create policy p_sub_write on public.todo_subtasks for all using (
  exists (select 1 from public.todos t where t.id = todo_id and t.owner_id = auth.uid())
) with check (
  exists (select 1 from public.todos t where t.id = todo_id and t.owner_id = auth.uid())
);

-- day_reflections: owner-only
drop policy if exists p_refl_select on public.day_reflections;
create policy p_refl_select on public.day_reflections for select using (user_id = auth.uid());
drop policy if exists p_refl_write on public.day_reflections;
create policy p_refl_write on public.day_reflections for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- daily_targets: read by duo member, write by owner
drop policy if exists p_tgt_select on public.daily_targets;
create policy p_tgt_select on public.daily_targets for select
  using (public.is_duo_member(duo_id, auth.uid()));
drop policy if exists p_tgt_write on public.daily_targets;
create policy p_tgt_write on public.daily_targets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_duo_member(duo_id, auth.uid()));

-- reactions
drop policy if exists p_rx_select on public.reactions;
create policy p_rx_select on public.reactions for select
  using (public.is_duo_member(duo_id, auth.uid()));
drop policy if exists p_rx_insert on public.reactions;
create policy p_rx_insert on public.reactions for insert with check (
  from_user_id = auth.uid()
  and public.is_duo_member(duo_id, auth.uid())
  and public.is_duo_member(duo_id, to_user_id)
);
drop policy if exists p_rx_update on public.reactions;
create policy p_rx_update on public.reactions for update
  using (to_user_id = auth.uid()) with check (to_user_id = auth.uid());

-- stats and achievements (self-only read)
drop policy if exists p_stats_select on public.user_stats;
create policy p_stats_select on public.user_stats for select using (
  user_id = auth.uid()
  or exists (select 1 from public.duo_members m1 join public.duo_members m2 on m1.duo_id = m2.duo_id
             where m1.user_id = auth.uid() and m2.user_id = user_stats.user_id and m1.active and m2.active)
);
drop policy if exists p_stats_update on public.user_stats;
create policy p_stats_update on public.user_stats for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_ach_select on public.achievements;
create policy p_ach_select on public.achievements for select using (true);
drop policy if exists p_ua_select on public.user_achievements;
create policy p_ua_select on public.user_achievements for select using (user_id = auth.uid());
drop policy if exists p_ua_insert on public.user_achievements;
create policy p_ua_insert on public.user_achievements for insert with check (user_id = auth.uid());

-- focus sessions
drop policy if exists p_fs_select on public.focus_sessions;
create policy p_fs_select on public.focus_sessions for select
  using (public.is_duo_member(duo_id, auth.uid()));
drop policy if exists p_fs_write on public.focus_sessions;
create policy p_fs_write on public.focus_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_duo_member(duo_id, auth.uid()));

-- xp_ledger: read own
drop policy if exists p_xp_select on public.xp_ledger;
create policy p_xp_select on public.xp_ledger for select using (user_id = auth.uid());

-- =====================================================
-- Realtime publication (replicate changes we need live)
-- =====================================================
alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.todo_subtasks;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.daily_targets;
alter publication supabase_realtime add table public.user_stats;
