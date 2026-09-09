-- Miyar Rental — fix the admin-bootstrap deadlock
--
-- guard_profile_privileges_trg silently blocked promoting an EXISTING
-- profile to admin via direct SQL access (migrations, the SQL editor, an
-- MCP session), because is_admin() reads auth.uid() and that is null
-- outside a real authenticated request. New signups worked fine
-- (handle_new_user is a separate insert-time trigger that never checks
-- is_admin()), but there was no way to promote a profile created before it
-- was allowlisted without already being an admin. Confirmed live: an
-- UPDATE with a freshly allowlisted email silently no-op'd.
--
-- Direct database access already bypasses RLS entirely, so the guard's
-- actual job is stopping an authenticated non-admin client from writing
-- role/is_blocked on themselves — not stopping trusted server-side access
-- that carries no session at all.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or (select auth.uid()) is null then
    return new;
  end if;
  new.role := old.role;
  new.is_blocked := old.is_blocked;
  return new;
end;
$$;
