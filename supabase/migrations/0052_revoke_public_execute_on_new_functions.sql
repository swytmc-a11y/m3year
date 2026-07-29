-- Miyar (معيار) — finish locking the functions added in 0046/0048.
--
-- 0047 revoked complete_ai_report/fail_ai_report from anon, and that looked
-- like enough — but anon could still call them. Postgres grants EXECUTE on
-- every new function to PUBLIC by default, and revoking from a role does not
-- remove what that role inherits through PUBLIC. Confirmed by reading proacl
-- directly: the "=X/postgres" entry (empty grantee = PUBLIC) was still there,
-- and has_function_privilege('anon', ...) still returned true.
--
-- This is the mirror image of the pitfall 0004 documents: there, revoking
-- from PUBLIC left the direct anon/authenticated grants in place. Both halves
-- are needed. public.is_admin() is the reference for a correctly locked
-- function — no "=X/" entry, only the roles that actually need it.
--
-- Checking this properly matters too: `proacl::text like '%=X/%'` looks right
-- and is wrong, because "postgres=X/postgres" matches it as well. The real
-- test is whether any ACL entry has an empty grantee:
--   exists (select 1 from unnest(proacl) a where a::text like '=%')

revoke execute on function public.complete_ai_report(uuid, jsonb, text) from public;
revoke execute on function public.fail_ai_report(uuid) from public;

-- blocked_between is not reachable over the API regardless (PostgREST routes
-- only the public schema, and USAGE on `private` is limited to
-- authenticated/service_role), so this is defence in depth — but leaving
-- PUBLIC on it means any role added later silently inherits it.
revoke execute on function private.blocked_between(uuid, uuid) from public;
grant execute on function private.blocked_between(uuid, uuid) to authenticated;
