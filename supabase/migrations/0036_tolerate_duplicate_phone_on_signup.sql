-- Miyar (معيار) — stop a duplicate phone from aborting account creation.
--
-- Confirmed from the live auth logs:
--   duplicate key value violates unique constraint
--   "profile_contact_phone_unique_idx" (SQLSTATE 23505)
--   -> error_code: unexpected_failure
--
-- handle_new_user runs inside the auth.users INSERT, so a phone already
-- claimed by another profile raised inside that transaction and took the
-- whole signup down. The user just saw "تعذّر إنشاء الحساب الآن" with no way
-- to understand or fix it.
--
-- The phone collected on the email/password signup form is self-asserted and
-- unverified — it is contact information at that point, not proof of
-- anything. It must never outrank the existing binding (the number stays
-- with whoever holds it), and it equally must not block a legitimate signup.
-- So: keep the phone when it is free, drop it to null when it is already
-- taken, and let the account be created either way. The number can still be
-- bound properly later by actually proving possession through the WhatsApp
-- OTP flow, which is the only path that should ever establish that link.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'project_owner',
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  v_phone := nullif(new.raw_user_meta_data ->> 'phone', '');

  -- Never let an unverified, self-asserted phone take a number that another
  -- account already holds — and never let that collision fail the signup.
  if v_phone is not null and exists (
    select 1 from public.profile_contact pc
    where pc.phone = v_phone and pc.id <> new.id
  ) then
    v_phone := null;
  end if;

  insert into public.profile_contact (id, email, phone)
  values (new.id, new.email, v_phone)
  on conflict (id) do update set email = excluded.email, phone = excluded.phone;

  return new;
end;
$$;
