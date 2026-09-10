-- Every `revoke all on function ... from public` in this project has been
-- doing nothing.
--
-- Supabase grants EXECUTE on functions in `public` to the `anon` and
-- `authenticated` roles explicitly, and revoking from PUBLIC does not touch
-- an explicit role grant. So each of those revokes read like a lock and was
-- not one. What was actually reachable without signing in:
--
--   wallet_available_for_booking(user, booking) -> anyone's wallet balance
--   issue_invoice_for_booking(booking)          -> mint a numbered tax
--                                                  invoice for a booking that
--                                                  was never paid
--   expire_stale_bookings()                     -> cancel pending bookings
--   send_booking_reminders()                    -> fire the reminder run
--
-- Rather than chase them one at a time, the rule is inverted: EXECUTE is
-- removed from every SECURITY DEFINER function in `public`, and granted back
-- only to the ones the clients are supposed to call, listed in a table so
-- the next function added is closed by default and the audit below can
-- check the intent instead of a hand-maintained comment.

create table public.rpc_allowlist (
  proname text primary key,
  allow_anon boolean not null default false,
  allow_authenticated boolean not null default true,
  reason text not null
);

insert into public.rpc_allowlist (proname, allow_anon, allow_authenticated, reason) values
  -- Named inside RLS policy expressions: without EXECUTE the policy cannot
  -- even be planned and every statement on those tables fails.
  ('is_admin',                 true,  true,  'RLS policy expression'),
  ('is_blocked',               true,  true,  'RLS policy expression'),
  ('is_documents_ready',       true,  true,  'RLS policy expression'),
  -- Browsing works signed out, so these have to answer anon.
  ('home_feed',                true,  true,  'home screen, signed out too'),
  ('car_badges',               true,  true,  'car cards'),
  ('car_unavailable_ranges',   true,  true,  'car calendar'),
  ('cars_unavailable_between', true,  true,  'dated search'),
  ('quote_booking',            true,  true,  'price shown before sign-in'),
  ('validate_coupon',          true,  true,  'coupon field in the booking form'),
  -- Signed-in only.
  ('activate_signup_credit',   false, true,  'wallet: welcome and referral'),
  ('my_referral_summary',      false, true,  'invite screen'),
  ('wallet_balance',           false, true,  'wallet screen, checks the caller'),
  ('quote_extension',          false, true,  'extension price'),
  ('request_extension',        false, true,  'extension request'),
  ('log_audit',                false, true,  'admin action trail');

alter table public.rpc_allowlist enable row level security;
create policy rpc_allowlist_admin_read on public.rpc_allowlist
  for select using (public.is_admin());

do $lock$
declare
  fn record;
  a public.rpc_allowlist%rowtype;
begin
  for fn in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prosecdef
  loop
    -- Trigger functions included: PostgreSQL does not check EXECUTE when a
    -- trigger fires, so revoking here cannot break a trigger.
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated',
                   fn.proname, fn.args);

    select * into a from public.rpc_allowlist where proname = fn.proname;
    if found then
      if a.allow_anon then
        execute format('grant execute on function public.%I(%s) to anon', fn.proname, fn.args);
      end if;
      if a.allow_authenticated then
        execute format('grant execute on function public.%I(%s) to authenticated',
                       fn.proname, fn.args);
      end if;
    end if;
  end loop;
end
$lock$;

-- A fixed search_path so the function cannot be redirected by a caller's
-- own schema. These two build the tax QR, which makes them the last place
-- to allow that.
create or replace function public.zatca_tlv(p_tag integer, p_value text)
returns bytea
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_bytes bytea := convert_to(coalesce(p_value, ''), 'UTF8');
begin
  if octet_length(v_bytes) > 255 then
    raise exception 'zatca_tlv_value_too_long (tag %)', p_tag;
  end if;
  return decode(lpad(to_hex(p_tag), 2, '0'), 'hex')
      || decode(lpad(to_hex(octet_length(v_bytes)), 2, '0'), 'hex')
      || v_bytes;
end;
$$;

create or replace function public.zatca_qr(
  p_seller_name text,
  p_vat_number text,
  p_issued_at timestamptz,
  p_total numeric,
  p_vat_amount numeric
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select replace(
    encode(
      public.zatca_tlv(1, p_seller_name)
      || public.zatca_tlv(2, p_vat_number)
      || public.zatca_tlv(3, to_char(p_issued_at at time zone 'UTC',
                                     'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
      || public.zatca_tlv(4, to_char(p_total, 'FM9999999990.00'))
      || public.zatca_tlv(5, to_char(p_vat_amount, 'FM9999999990.00')),
      'base64'),
    E'\n', '');
$$;

revoke all on function public.zatca_tlv(integer, text) from public, anon, authenticated;
revoke all on function public.zatca_qr(text, text, timestamptz, numeric, numeric)
  from public, anon, authenticated;

-- ----------------------------------------------------------------- audit ---
-- The mirror of audit_client_executable_functions(): that one finds what a
-- client needs and cannot run, this one finds what a client can run and
-- should not. Both are meant to return no rows.
create or replace function public.audit_internal_function_exposure()
returns table (
  routine text,
  reachable_by text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         case
           when has_function_privilege('anon', p.oid, 'execute')
            and has_function_privilege('authenticated', p.oid, 'execute')
             then 'anon + authenticated'
           when has_function_privilege('anon', p.oid, 'execute') then 'anon'
           else 'authenticated'
         end
    from pg_proc p
    left join public.rpc_allowlist a on a.proname = p.proname
   where p.pronamespace = 'public'::regnamespace
     and p.prosecdef
     and (
       (has_function_privilege('anon', p.oid, 'execute')
          and coalesce(a.allow_anon, false) is not true)
       or
       (has_function_privilege('authenticated', p.oid, 'execute')
          and coalesce(a.allow_authenticated, false) is not true)
     )
   order by 1;
$$;

revoke all on function public.audit_internal_function_exposure() from public, anon, authenticated;
