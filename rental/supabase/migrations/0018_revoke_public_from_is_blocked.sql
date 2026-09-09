-- Postgres grants EXECUTE to PUBLIC on every newly created function, so the
-- rewritten no-arg is_blocked() silently arrived with a PUBLIC grant — the
-- exact default the hardening pass went through the whole schema to remove.
-- Access is unchanged in practice (anon and authenticated are granted
-- explicitly right below), but leaving the implicit grant means the ACL no
-- longer states who may run this, and the next role added to the database
-- would inherit it by accident.
revoke execute on function public.is_blocked() from public;
grant execute on function public.is_blocked() to anon, authenticated;
