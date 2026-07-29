-- Miyar (معيار) — one user blocking another.
--
-- Distinct from profiles.is_blocked (0021), which is an ADMIN banning an
-- account platform-wide. This is a USER cutting off one other user: the
-- marketplace's whole deal mechanism is direct messaging, so without this a
-- harasser or scammer can keep messaging with the victim having no way to
-- stop them.
--
-- A block cuts the conversation both ways. The blocker also stops being able
-- to send — otherwise "block" would be a one-way mute that still lets the
-- blocker keep talking at someone who can't reply.
--
-- Privacy: only the blocker can see their own block rows. The blocked party
-- must never be able to learn they were blocked, so:
--   - user_blocks_select_own is blocker-only (plus admin),
--   - the helper that both directions of the check need lives in a `private`
--     schema. PostgREST only routes the schemas it is configured with
--     (public), so a function there simply has no /rest/v1/rpc endpoint and
--     cannot be called to probe whether two arbitrary users blocked each
--     other. Revoking from anon/authenticated is not an option here: RLS
--     policy expressions are evaluated as the querying role, which therefore
--     needs EXECUTE.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- FKs point at public.profiles (not auth.users) like every other table here:
-- profiles.id is auth.users.id so the cascade is identical, but PostgREST can
-- only embed a related row across a FK it can see, and the blocked-users list
-- needs the name.
create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

-- The "did anyone block me" direction of every check scans by blocked_id.
create index user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

create policy user_blocks_select_own on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()) or public.is_admin());

create policy user_blocks_insert_own on public.user_blocks
  for insert to authenticated
  with check (
    blocker_id = (select auth.uid())
    and not public.is_blocked((select auth.uid()))
  );

create policy user_blocks_delete_own on public.user_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

create or replace function private.blocked_between(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks ub
    where (ub.blocker_id = a and ub.blocked_id = b)
       or (ub.blocker_id = b and ub.blocked_id = a)
  );
$$;

grant execute on function private.blocked_between(uuid, uuid) to authenticated;

-- Enforcement. Both policies below are the current live definitions plus one
-- new clause, so the existing ownership/blocked-account/published rules are
-- carried over verbatim rather than rewritten.

drop policy messages_insert_participant on public.messages;
create policy messages_insert_participant on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and not public.is_blocked((select auth.uid()))
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.owner_id = (select auth.uid()) or c.investor_id = (select auth.uid()))
        and not private.blocked_between(c.owner_id, c.investor_id)
    )
  );

drop policy conversations_insert_investor on public.conversations;
create policy conversations_insert_investor on public.conversations
  for insert to authenticated
  with check (
    investor_id = (select auth.uid())
    and owner_id <> (select auth.uid())
    and not public.is_blocked((select auth.uid()))
    and not private.blocked_between(investor_id, owner_id)
    and (
      (listing_id is not null and exists (
        select 1 from public.listings l
        where l.id = conversations.listing_id
          and l.owner_id = conversations.owner_id
          and l.status = 'published'
      ))
      or (franchise_id is not null and exists (
        select 1 from public.franchises f
        where f.id = conversations.franchise_id
          and f.owner_id = conversations.owner_id
          and f.status = 'published'
      ))
    )
  );
