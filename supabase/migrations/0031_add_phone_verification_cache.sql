-- Authentica OTPs are single-use: the signup flow calls verify-otp twice for
-- brand-new numbers (once to check the account exists, once again after the
-- user enters their name), and the second call was being rejected by
-- Authentica as an already-consumed code (401). This table caches a
-- successful verification for a short window so the second local step can
-- skip re-calling Authentica. Service-role only, no client grants.
create table public.phone_verifications (
  phone text primary key,
  otp text not null,
  verified_at timestamptz not null default now()
);

alter table public.phone_verifications enable row level security;
