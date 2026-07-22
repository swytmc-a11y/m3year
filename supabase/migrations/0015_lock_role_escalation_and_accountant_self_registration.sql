-- Prevent self-service privilege escalation: only an admin may change profiles.role.
create or replace function public.trg_lock_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role = old.role;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_lock_profile_role() from public, anon, authenticated;

create trigger lock_profile_role_change
  before update on public.profiles
  for each row execute function public.trg_lock_profile_role();

-- Only users an admin has already flagged role='accountant' may register an
-- accountants row (which grants the ability to claim/complete financial
-- verifications). Previously anyone could self-insert here.
drop policy accountants_insert_own on public.accountants;

create policy accountants_insert_own on public.accountants
  for insert with check (
    auth.uid() = id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'accountant'
    )
  );
