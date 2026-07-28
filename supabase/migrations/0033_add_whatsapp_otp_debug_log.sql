-- Miyar (معيار) — temporary diagnostic table for the WhatsApp OTP flow.
--
-- Real users are hitting a persistent "الرمز غير صحيح أو منتهي الصلاحية"
-- (verified:false from Authentica) on essentially every verify attempt, even
-- entering the exact code shown in the WhatsApp message within seconds.
-- Three prior fixes already landed here (channel-scoped `method` field,
-- 4-digit code length, single-use OTP replay across the signup two-step) and
-- the failure persists, which points at a further request-shape mismatch
-- with Authentica's real API contract that guessing can't resolve safely.
--
-- This table captures the exact request sent to Authentica and the exact
-- raw response received, for both send and verify calls, so the next real
-- attempt gives conclusive evidence instead of another guess. Service-role
-- only (no RLS grants to anon/authenticated) — same posture as
-- phone_otp_throttle/phone_verifications. Intended to be dropped once the
-- root cause is confirmed and fixed.

create table public.whatsapp_otp_debug (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('send', 'verify')),
  phone text not null,
  otp text,
  request_body text not null,
  http_status int,
  response_body text,
  error text,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_otp_debug enable row level security;
-- No policies — service_role (used only inside the Edge Functions) bypasses
-- RLS entirely; anon/authenticated get zero access, matching phone_otp_throttle.
