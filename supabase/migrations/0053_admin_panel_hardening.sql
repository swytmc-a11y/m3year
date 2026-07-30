-- Miyar (معيار) — admin panel hardening: step-up OTP + a real data bug fix.
--
-- 1) admin_otp_verifications: a DB-backed "this admin completed the email OTP
-- step-up recently" flag, checked by requireAdmin() in the web control panel
-- alongside is_admin() and an email allowlist. Deliberately not a client
-- cookie carrying its own trust — the same "never trust the client, RLS is
-- the backstop" reasoning as everywhere else in this schema. A row only
-- proves anything if it was written by that admin's own authenticated
-- session (enforced by RLS below), and it expires.

create table public.admin_otp_verifications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.admin_otp_verifications enable row level security;

create policy admin_otp_verifications_select_own on public.admin_otp_verifications
  for select to authenticated
  using (user_id = (select auth.uid()) and public.is_admin());

create policy admin_otp_verifications_upsert_own on public.admin_otp_verifications
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_admin());

create policy admin_otp_verifications_update_own on public.admin_otp_verifications
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_admin())
  with check (user_id = (select auth.uid()) and public.is_admin());

create policy admin_otp_verifications_delete_own on public.admin_otp_verifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 2) Real bug: the mobile app lets a user report a franchise
-- (app/franchises/[id].tsx links to /report?targetType=franchise), and
-- lib/reports.ts's type signature has always allowed it — but this check
-- constraint only ever allowed 'listing' and 'user'. Every franchise report
-- has been silently failing with a constraint violation since the franchise
-- module shipped.
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type = any (array['listing', 'franchise', 'user']));
