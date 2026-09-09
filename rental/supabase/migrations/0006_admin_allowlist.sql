-- Miyar Rental — operator allowlist
--
-- The app already knows which addresses may operate the fleet
-- (ADMIN_ALLOWED_EMAILS in lib/auth.ts). Mirroring that list in the database
-- means the first account created with one of those addresses is an admin
-- immediately, rather than depending on someone remembering to run an UPDATE
-- after signup. It also keeps "who may operate this fleet" an explicit list
-- instead of an accident of who signed up first.

create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;

create policy admin_emails_select_admin on public.admin_emails
  for select to authenticated using (public.is_admin());

insert into public.admin_emails (email) values ('swytmc@gmail.com')
on conflict (email) do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := 'customer';
begin
  if new.email is not null
     and exists (select 1 from public.admin_emails a
                 where lower(a.email) = lower(new.email)) then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email, new.phone, v_role)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Covers an account that already exists from an earlier attempt.
update public.profiles p
set role = 'admin'
from public.admin_emails a
where lower(p.email) = lower(a.email) and p.role <> 'admin';
