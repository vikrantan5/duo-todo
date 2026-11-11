-- =========================================================
-- Duo Todo — maintain user_stats streaks from real history
-- user_stats.current_streak / longest_streak were never updated by anything
-- (only total_xp moved via award_xp_for_todo), so any UI or query reading the
-- streak from the DB always saw 0. This mirrors the dashboard's derivation:
-- a qualifying day = a day on which at least one todo was completed
-- (completed_at when present, else the scheduled date_key for legacy rows).
-- Current streak counts consecutive qualifying days ending today or yesterday
-- (yesterday = grace, matching the client). Apply AFTER 001-005.
-- =========================================================

create or replace function public.recompute_user_streak(_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_days date[];
  v_today date := current_date;
  v_cursor date;
  v_current int := 0;
  v_longest int := 0;
  v_run int := 0;
  v_prev date;
  d date;
begin
  select coalesce(array_agg(day order by day), '{}'::date[])
    into v_days
    from (
      select distinct coalesce(completed_at::date, date_key) as day
      from public.todos
      where owner_id = _user and is_completed
    ) s;

  -- current streak: consecutive days ending today, else yesterday (grace)
  v_cursor := case when v_today = any(v_days) then v_today else v_today - 1 end;
  while v_cursor = any(v_days) loop
    v_current := v_current + 1;
    v_cursor := v_cursor - 1;
  end loop;

  -- longest streak: walk the ordered qualifying days
  foreach d in array v_days loop
    if v_prev is not null and d = v_prev + 1 then
      v_run := v_run + 1;
    else
      v_run := 1;
    end if;
    v_longest := greatest(v_longest, v_run);
    v_prev := d;
  end loop;

  insert into public.user_stats (user_id, current_streak, longest_streak, last_qualifying_day, updated_at)
  values (
    _user,
    v_current,
    v_longest,
    (select max(day) from unnest(v_days) as u(day)),
    now()
  )
  on conflict (user_id) do update set
    current_streak = excluded.current_streak,
    longest_streak = greatest(user_stats.longest_streak, excluded.longest_streak),
    last_qualifying_day = excluded.last_qualifying_day,
    updated_at = now();
end$$;

create or replace function public.todos_streak_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    perform public.recompute_user_streak(OLD.owner_id);
  else
    perform public.recompute_user_streak(NEW.owner_id);
  end if;
  return null;
end$$;

drop trigger if exists trg_todos_streak on public.todos;
create trigger trg_todos_streak
  after insert or update or delete on public.todos
  for each row execute function public.todos_streak_trigger();
