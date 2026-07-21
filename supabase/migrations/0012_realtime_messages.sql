-- Miyar (معيار) — Phase 5: enable Realtime (postgres_changes) on messages so
-- the chat screen updates live while both participants have it open. RLS
-- still applies to Realtime subscriptions — a client only receives change
-- events for rows it's permitted to SELECT.
alter publication supabase_realtime add table public.messages;
