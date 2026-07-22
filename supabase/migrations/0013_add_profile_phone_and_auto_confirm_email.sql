-- Miyar (معيار) — Phase 7: real email/password auth.
--
-- 1) profiles.phone: a plain contact field collected at signup, separate
--    from auth.users.phone (which is reserved for the phone-OTP identity
--    flow, not yet enabled since no SMS provider is configured).
alter table public.profiles
  add column phone text;

-- 2) No email provider (SMTP) is configured for this project, so the
--    default "confirm your email" link would never be delivered — the same
--    dead end phone-OTP hit without an SMS provider. Auto-confirm email
--    signups at insert time so users can sign in immediately after signup.
--    This only stamps email_confirmed_at; confirmed_at stays a generated
--    column (LEAST of email/phone confirmed) and is never written directly.
create or replace function public.auto_confirm_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and new.email_confirmed_at is null then
    new.email_confirmed_at = now();
  end if;
  return new;
end;
$$;

create trigger auto_confirm_email_on_signup
  before insert on auth.users
  for each row execute function public.auto_confirm_email();

revoke execute on function public.auto_confirm_email() from public, anon, authenticated;

-- 3) Capture full_name (and phone, best-effort) from signup metadata into
--    the profile row at creation time, instead of a second client-side
--    update call right after signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    'project_owner',
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
