-- Miyar (معيار) — stop force-confirming email at signup now that a real SMTP
-- provider (Resend) is wired into Supabase Auth.
--
-- auto_confirm_email (migration 0013) existed only because no SMTP provider
-- was configured: without it, Supabase's real "confirm your email" link
-- would generate but never send, leaving every signup stuck at a dead end.
-- SMTP is now live, so that workaround is the wrong behavior going forward —
-- accounts should genuinely require the user to click the confirmation link
-- Supabase now actually delivers.

drop trigger if exists auto_confirm_email_on_signup on auth.users;
drop function if exists public.auto_confirm_email();
