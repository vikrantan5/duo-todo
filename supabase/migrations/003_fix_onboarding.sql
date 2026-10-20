-- Atomic, RLS-safe onboarding flow.
-- The browser never inserts directly into duos or duo_members. This function
-- validates auth.uid(), creates both records, and stores the invite hash in
-- one transaction so onboarding cannot leave a half-created Duo behind.

create or replace function public.create_duo_with_invitation(
  _name text,
  _token_hash text,
  _expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_duo_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (
    select 1 from public.duo_members
    where user_id = uid and active = true
  ) then
    raise exception 'you already belong to a duo';
  end if;

  if coalesce(trim(_name), '') = '' then
    raise exception 'duo name is required';
  end if;

  if length(coalesce(_token_hash, '')) < 32 then
    raise exception 'invalid invitation token';
  end if;

  insert into public.duos (name, created_by)
  values (trim(_name), uid)
  returning id into new_duo_id;

  insert into public.duo_members (duo_id, user_id, role)
  values (new_duo_id, uid, 'owner');

  insert into public.duo_invitations (duo_id, created_by, token_hash, expires_at)
  values (new_duo_id, uid, _token_hash, _expires_at);

  return new_duo_id;
end;
$$;

revoke all on function public.create_duo_with_invitation(text, text, timestamptz) from public;
grant execute on function public.create_duo_with_invitation(text, text, timestamptz) to authenticated;