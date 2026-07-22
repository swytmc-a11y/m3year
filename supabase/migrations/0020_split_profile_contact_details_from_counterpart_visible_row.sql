-- Security fix (found by security review of migration 0019): profiles.email
-- and profiles.phone were reachable through profiles_select_conversation_counterparts
-- -- a row-level policy with no column restriction -- so anyone who has ever
-- messaged a user could fetch that user's email/phone directly via the
-- PostgREST REST API (select=email), even though no app UI reads those
-- columns for a counterpart. RLS is the only enforcement layer in this
-- architecture (no service_role key is used anywhere), so this was a real
-- gap, not just a UI omission. Fix: move both columns to a separate table
-- readable only by the owner or an admin, same pattern as
-- listing_confidential (migration 0016).
create table public.profile_contact (
  id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  phone text,
  updated_at timestamptz not null default now()
);
alter table public.profile_contact enable row level security;

create policy profile_contact_select_own_or_admin on public.profile_contact
  for select using (auth.uid() = id or is_admin());

create trigger set_profile_contact_updated_at
  before update on public.profile_contact
  for each row execute function public.set_updated_at();

insert into public.profile_contact (id, email, phone)
select id, email, phone from public.profiles;

alter table public.profiles
  drop column email,
  drop column phone;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'project_owner',
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.profile_contact (id, email, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update set email = excluded.email, phone = excluded.phone;

  return new;
end;
$$;
