-- Four outages so far shared one cause: a function that a client must be able
-- to execute had its EXECUTE revoked, and nothing noticed until a customer
-- hit it. Twice it was is_admin(), then is_blocked(), then
-- generate_booking_reference() behind a trigger. Each was found by accident,
-- in production, one at a time.
--
-- This turns that class of bug into something a single query answers.
--
-- It reports any function that a client-facing code path needs but cannot
-- run, covering the two ways a client reaches one:
--   1. referenced inside an RLS policy expression — the policy cannot even be
--      planned without EXECUTE, so the whole statement fails;
--   2. called from the body of a SECURITY INVOKER trigger function on a table
--      clients write to — the inner call inherits the caller's rights.
--
-- A trigger function that is SECURITY DEFINER is exempt: its body runs as the
-- owner, which is exactly why set_booking_reference() was changed to one.
create or replace function public.audit_client_executable_functions()
returns table (
  problem text,
  routine text,
  needed_by text,
  anon_can_execute boolean,
  authenticated_can_execute boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fn record;
begin
  for v_fn in
    -- Functions named inside RLS policy expressions.
    select p.proname,
           p.oid,
           'RLS policy ' || quote_ident(pol.tablename) || '.' || quote_ident(pol.policyname) as source
    from pg_policies pol
    join pg_proc p on p.pronamespace = 'public'::regnamespace
    where pol.schemaname = 'public'
      and (coalesce(pol.qual,'') || ' ' || coalesce(pol.with_check,''))
          ~ ('\m' || p.proname || '\s*\(')

    union all

    -- Functions called from the body of a SECURITY INVOKER trigger function.
    select callee.proname,
           callee.oid,
           'trigger ' || quote_ident(tg.tgname) || ' on ' || quote_ident(c.relname) as source
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_proc trigfn on trigfn.oid = tg.tgfoid
    join pg_proc callee on callee.pronamespace = 'public'::regnamespace
    where not tg.tgisinternal
      and c.relnamespace = 'public'::regnamespace
      and trigfn.prosecdef = false
      and callee.oid <> trigfn.oid
      and pg_get_functiondef(trigfn.oid) ~ ('\m' || callee.proname || '\s*\(')
  loop
    if not has_function_privilege('authenticated', v_fn.oid, 'execute')
       or not has_function_privilege('anon', v_fn.oid, 'execute') then
      problem := 'client cannot execute a function it must reach';
      routine := v_fn.proname;
      needed_by := v_fn.source;
      anon_can_execute := has_function_privilege('anon', v_fn.oid, 'execute');
      authenticated_can_execute := has_function_privilege('authenticated', v_fn.oid, 'execute');
      return next;
    end if;
  end loop;
end;
$$;

-- Diagnostic tooling, not a client API.
revoke execute on function public.audit_client_executable_functions() from public;
revoke execute on function public.audit_client_executable_functions() from anon, authenticated;
