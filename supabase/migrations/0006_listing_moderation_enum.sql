-- Miyar (معيار) — Phase 3: listing moderation states.
--
-- A listing published by an owner is NOT publicly visible until an admin
-- approves it. New states:
--   pending_review — owner submitted, waiting for admin moderation
--   rejected       — admin declined (with a reason)
--
-- Added in their own migration because Postgres forbids using a new enum value
-- in the same transaction that adds it.
alter type public.listing_status add value if not exists 'pending_review';
alter type public.listing_status add value if not exists 'rejected';
