-- Miyar (معيار) — Phase 2: remove REST RPC access to internal functions.
--
-- Supabase's default privileges grant EXECUTE on new public functions to the
-- `anon` and `authenticated` roles DIRECTLY, so the earlier `revoke ... from
-- public` left those direct grants intact. Trigger/guard functions must not be
-- reachable via /rest/v1/rpc. Trigger execution does not consult the invoking
-- user's EXECUTE privilege, so these revokes do not affect the triggers.
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.guard_profile_role() from anon, authenticated;
revoke execute on function public.guard_listing_protected_columns() from anon, authenticated;
revoke execute on function public.guard_accountant_protected_columns() from anon, authenticated;

-- is_admin() is referenced only by `to authenticated` policies; anon never
-- evaluates it. It must stay executable by `authenticated` (RLS calls it as
-- the querying role), which is the intended, documented Supabase pattern.
revoke execute on function public.is_admin() from anon;
