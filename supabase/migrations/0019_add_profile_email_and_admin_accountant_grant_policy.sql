-- 1) Denormalized copy of auth.users.email onto profiles, same rationale as
--    phone in migration 0013: the admin dashboard's client uses the anon/
--    authenticated Supabase client, which cannot read auth.users directly
--    (that requires service_role, which this project deliberately never
--    uses). Making email searchable requires it living in a table RLS can
--    scope normally.
alter table public.profiles
  add column email text;

-- Backfill bypasses triggers for this one statement: guard_profile_role()
-- rejects any UPDATE that leaves a row with role in ('admin','accountant')
-- unless the caller is an admin, even when role itself isn't changing (this
-- migration runs with no authenticated JWT, so is_admin() is false here).
do $$
begin
  set local session_replication_role = replica;
  update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    'project_owner',
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Let an admin grant accountant access to any existing registered user
-- directly, without requiring that user to self-apply first. Existing
-- accountants_insert_own policy (auth.uid() = id AND profiles.role =
-- 'accountant') is untouched; RLS policies for the same command are OR'd,
-- so this is purely additive.
create policy accountants_insert_admin on public.accountants
  for insert
  to authenticated
  with check (is_admin());
