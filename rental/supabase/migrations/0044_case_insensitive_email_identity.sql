-- A phone and an email together identify one account, and neither may be
-- reused under a different account once claimed:
--
--   phone: already enforced — profiles_phone_key (0012) is a unique index,
--   and verify-whatsapp-otp looks a phone up before ever offering to create
--   a new account, logging the existing owner in instead. Untouched here.
--
--   email: auth.users carries its own unique index (users_email_partial_key),
--   but it is on the raw `email` column — case-sensitive. "Ahmed@x.com" and
--   "ahmed@x.com" pass it as two different values, so a customer already
--   registered under one casing could open a SECOND, fully independent
--   account with a different phone by resubmitting the same address in a
--   different case. This is a known, long-standing GoTrue behaviour, not a
--   bug specific to this project — the fix belongs at a layer this project
--   controls rather than in Supabase's own managed auth schema.
--
-- profiles.email is populated from auth.users.email inside handle_new_user(),
-- which runs in the SAME transaction as the auth.users insert. So a unique
-- index here, enforced case-insensitively, rejects the profiles insert and
-- rolls back the whole signup — no auth.users row is left behind either.
--
-- Verified live (rolled-back simulation): a case-variant repeat is refused
-- and leaves no auth.users row; a genuinely different email still works;
-- an existing account's phone is untouched by a rejected attempt against
-- its email under a different phone.
create unique index profiles_email_ci_key
  on public.profiles (lower(btrim(email)))
  where email is not null;

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

  begin
    insert into public.profiles (id, full_name, email, phone, role)
    values (
      new.id,
      new.raw_user_meta_data ->> 'full_name',
      new.email,
      new.phone,
      v_role
    )
    on conflict (id) do nothing;
  exception
    when unique_violation then
      -- Reads as a normal validation failure to the client rather than a
      -- raw constraint name, the same way this project already surfaces
      -- addon_not_available_for_car and similar trigger-raised checks.
      raise exception 'هذا البريد الإلكتروني مسجّل مسبقًا.';
  end;

  return new;
end;
$$;
