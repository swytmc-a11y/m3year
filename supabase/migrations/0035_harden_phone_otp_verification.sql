-- Miyar (معيار) — security hardening for the WhatsApp OTP login bridge,
-- from a full audit of the phone + email auth surface.
--
-- 1) Brute-force protection on VERIFY.
--    send-whatsapp-otp has been throttled since migration 0029 (60s cooldown,
--    5/hour), but verify-whatsapp-otp had no limit at all. The Authentica
--    WhatsApp OTP is only 4 digits — 10,000 combinations — and the verify
--    Edge Function is public (verify_jwt=false, CORS *), so an attacker could
--    walk the whole keyspace for any Saudi number and mint a real session.
--    Our own attempt counter is the only thing under our control here; we
--    can't rely on unknown upstream limits for an account-takeover path.
--
-- 2) Plaintext OTPs at rest.
--    whatsapp_otp_debug (migration 0033) was an explicitly temporary
--    diagnostic table and recorded the live OTP in cleartext. It did its job:
--    it proved Authentica's success field is `status`, not `verified`, which
--    was the real cause of the persistent 401s. That's fixed and confirmed,
--    so the table — and the codes sitting in it — go away as originally
--    intended.
--
-- 3) phone_verifications had no retention.
--    It caches (phone, otp) so the two-step signup can re-verify locally
--    within 10 minutes, but nothing ever deleted the rows, leaving live-ish
--    codes in cleartext indefinitely. Rows are now purged on write.

-- 1) verify-side attempt counter -------------------------------------------
alter table public.phone_otp_throttle
  add column verify_count int not null default 0,
  add column verify_window_start timestamptz;

comment on column public.phone_otp_throttle.verify_count is
  'Failed verify attempts in the current window. Reset on success or when the window rolls over.';

-- 2) drop the temporary diagnostic table (and the cleartext codes in it) ----
drop table if exists public.whatsapp_otp_debug;

-- 3) retention for the short-lived verification cache -----------------------
-- The cache only needs to answer "was this exact phone+otp verified in the
-- last 10 minutes"; anything older is dead weight holding a cleartext code.
create or replace function public.purge_stale_phone_verifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.phone_verifications
  where verified_at < now() - interval '15 minutes';
  return null;
end;
$$;

create trigger purge_stale_phone_verifications_on_write
  after insert or update on public.phone_verifications
  for each statement execute function public.purge_stale_phone_verifications();

revoke execute on function public.purge_stale_phone_verifications() from public, anon, authenticated;

delete from public.phone_verifications
where verified_at < now() - interval '15 minutes';
