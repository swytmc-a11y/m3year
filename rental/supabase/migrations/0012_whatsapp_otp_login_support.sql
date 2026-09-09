-- Support tables and guards for WhatsApp OTP login.
--
-- Both tables are service_role-only: RLS is enabled and NO policy is created,
-- so anon/authenticated get nothing. Only the edge functions (which hold the
-- service role key) can read or write them.

-- Send cooldown + verify attempt budget, keyed by phone. There is no user
-- yet at send time, so this cannot hang off a user id.
create table if not exists public.phone_otp_throttle (
  phone text primary key,
  window_start timestamptz not null default now(),
  send_count int not null default 0,
  last_sent_at timestamptz,
  verify_count int not null default 0,
  verify_window_start timestamptz
);
alter table public.phone_otp_throttle enable row level security;

-- Authentica OTPs are single-use, but the new-account flow verifies the same
-- code twice (once to discover no account exists, once after the customer
-- supplies name/email/password). This caches the first success briefly so the
-- second call does not re-send a consumed code upstream.
create table if not exists public.phone_verifications (
  phone text primary key,
  otp text not null,
  verified_at timestamptz not null default now()
);
alter table public.phone_verifications enable row level security;

-- The phone is the login key, so one number must map to at most one account.
create unique index if not exists profiles_phone_key
  on public.profiles (phone) where phone is not null;

-- ...and the customer must not be able to point that key at themselves. In
-- Miyar this property came free: the phone lived in a table with no client
-- write policy at all. Here the phone is a column on profiles, which the
-- customer can otherwise update at will — so without this, anyone could set
-- their phone to a number they do not own and receive that number's logins.
-- Changing a phone is an operator action until there is a re-verification
-- flow, exactly like role and is_blocked already are.
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
  new.phone := old.phone;
  return new;
end;
$$;

-- WhatsApp signup passes the proven phone through signUp()'s metadata, which
-- lands in raw_user_meta_data rather than auth.users.phone — so reading only
-- the latter dropped it silently and left the account with no phone to log
-- back in with.
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
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    v_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
