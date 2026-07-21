-- Miyar (معيار) — Phase 5: internal messaging + push notification tokens.
--
-- conversations/messages tables and their RLS already exist from phase 2
-- (0001/0002). This migration adds device push token storage so the mobile
-- app can register for Expo push notifications, plus a couple of indexes to
-- support the messaging UI efficiently.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_unique_per_user unique (user_id, expo_push_token)
);

create index push_tokens_user_idx on public.push_tokens (user_id);

create trigger push_tokens_set_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();

alter table public.push_tokens enable row level security;

-- Owner-only access. No admin/public read: push tokens are only ever read by
-- the notify-new-message Edge Function via its service-role client, which
-- bypasses RLS entirely — no policy here needs to grant that.
create policy "push_tokens_select_own"
  on public.push_tokens for select
  to authenticated
  using (user_id = auth.uid());

create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "push_tokens_update_own"
  on public.push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  to authenticated
  using (user_id = auth.uid());
