-- profiles.phone is treated everywhere else as a verified identity: it is
-- the unique key verify-whatsapp-otp looks up to log a returning customer
-- straight into an account, and it is the gate wallet credit checks before
-- granting a welcome bonus. Yet handle_new_user() populated it from
-- raw_user_meta_data ->> 'phone' — a field ANY caller of auth.signUp() sets
-- directly, including the plain email/password screen, with no proof of
-- possession at all.
--
-- Two concrete exploits followed from that:
--   1. Free money: type any correctly-formatted number into the signup
--      form and immediately pass require_phone_for_welcome.
--   2. Account confusion: type someone else's real number. Because
--      profiles.phone is unique, when that person later proves possession
--      of their own number through the WhatsApp OTP flow, the lookup in
--      verify-whatsapp-otp finds THIS attacker's account (phone is already
--      claimed there) and logs the real owner into it.
--
-- new.phone (Supabase Auth's own phone-auth column, distinct from the
-- metadata blob) is not reachable by a client through signUp's options.data,
-- so it is the only input here actually outside the caller's control. This
-- app does not use native phone auth, so it is always null in practice —
-- meaning a fresh signup now always starts with phone = null, and every
-- verified number is written explicitly by server-side code that just
-- finished proving possession: verify-whatsapp-otp for a brand-new account
-- created through the WhatsApp OTP flow, and the new verify-account-phone
-- edge function for an existing account upgrading itself. Neither trusts
-- signUp metadata for it either.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role := 'customer';
begin
  if new.email is not null
     and exists (select 1 from public.admin_emails a
                 where lower(a.email) = lower(new.email)) then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.phone,
    v_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
