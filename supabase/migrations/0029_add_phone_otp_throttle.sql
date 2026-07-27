-- Rate-limit table for the WhatsApp OTP bridge (send-whatsapp-otp Edge Function).
-- No RLS policies are granted to anon/authenticated: this table is only ever
-- touched by the Edge Function's service_role client (same narrow, documented
-- exception already used in notify-new-message for push_tokens reads) — never
-- exposed to clients directly.
create table public.phone_otp_throttle (
  phone text primary key,
  window_start timestamptz not null default now(),
  send_count int not null default 0,
  last_sent_at timestamptz
);
alter table public.phone_otp_throttle enable row level security;
