-- Invite acceptance changes membership and profiles while the owner may
-- already have Today open. Publish both tables so the app can refresh its
-- server-rendered duo data without a manual page reload.

do $$
begin
  alter publication supabase_realtime add table public.duo_members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;