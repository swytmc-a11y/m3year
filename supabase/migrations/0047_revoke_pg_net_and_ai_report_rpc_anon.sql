-- Miyar (معيار) — close an SSRF hole introduced in 0045, and tidy 0046.
--
-- pg_net_start_request/pg_net_poll_request were meant to be service_role-only
-- (Paylink calls from the payment edge functions), but "revoke ... from
-- public" doesn't touch it: Supabase's default privileges grant EXECUTE on
-- new public functions to anon/authenticated directly (see 0004's comment —
-- the same pitfall recurring). The result was that any signed-in — or even
-- anonymous — caller could invoke /rest/v1/rpc/pg_net_start_request with an
-- arbitrary URL/method/headers/body: an open SSRF relay through this
-- project's own infrastructure. Confirmed live via has_function_privilege()
-- before this fix, and re-verified clear after.
revoke execute on function public.pg_net_start_request(text, text, jsonb, jsonb) from anon, authenticated;
revoke execute on function public.pg_net_poll_request(bigint) from anon, authenticated;

-- complete_ai_report / fail_ai_report only make sense for a signed-in caller
-- (they filter on requested_by = auth.uid(), which is null for anon and so
-- always matches nothing) — anon execute is dead weight, not a real hole,
-- but there's no reason to leave it granted.
revoke execute on function public.complete_ai_report(uuid, jsonb, text) from anon;
revoke execute on function public.fail_ai_report(uuid) from anon;
