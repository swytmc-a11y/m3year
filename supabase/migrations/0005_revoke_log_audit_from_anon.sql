-- Miyar (معيار) — Phase 2: anonymous users must not write audit entries.
-- 0002 revoked log_audit from PUBLIC and granted `authenticated`, but the
-- direct default grant to `anon` survived. Remove it. Signed-in server actions
-- (authenticated role) remain the only callers.
revoke execute on function public.log_audit(text, text, uuid, jsonb) from anon;
