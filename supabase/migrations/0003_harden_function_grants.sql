-- Miyar (معيار) — Phase 2: tighten function EXECUTE grants.
--
-- Trigger functions must never be invocable through the REST RPC surface.
-- Trigger execution itself does NOT require the invoking user to hold EXECUTE,
-- so revoking from PUBLIC is safe and keeps the triggers working.
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.guard_profile_role() from public;
revoke execute on function public.guard_listing_protected_columns() from public;
revoke execute on function public.guard_accountant_protected_columns() from public;

-- is_admin() only needs to be evaluable inside `to authenticated` RLS policies.
-- Anon-facing policies never reference it, so anon does not need EXECUTE.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
