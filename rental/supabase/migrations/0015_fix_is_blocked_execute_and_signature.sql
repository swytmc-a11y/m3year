-- Every booking insert has been failing with "permission denied for function
-- is_blocked" since the hardening pass revoked EXECUTE from PUBLIC. The
-- function is referenced inside the INSERT policy on bookings, so the caller
-- must be able to execute it merely to have the policy evaluated — exactly
-- the same trap that broke is_admin() for anonymous browsing. Nothing else
-- was affected: every other customer write path was simulated and passes.
--
-- Granting EXECUTE alone would restore booking, but it would also expose
-- is_blocked(uuid) as a callable RPC that answers "is this account blocked?"
-- for ANY user id someone cares to try. The argument is what makes that
-- possible, and no caller ever legitimately asks about anyone but
-- themselves — the policies only ever pass auth.uid(). So the argument goes
-- away: the no-arg version can only ever answer about the caller.

create or replace function public.is_blocked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_blocked from public.profiles where id = (select auth.uid())),
    false
  );
$$;

-- Policies must stop referencing the old signature before it can be dropped.
drop policy bookings_insert_own on public.bookings;
create policy bookings_insert_own on public.bookings
  for insert to authenticated
  with check (customer_id = (select auth.uid()) and not public.is_blocked());

drop policy reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and not public.is_blocked()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.customer_id = (select auth.uid())
        and b.status = 'completed'
    )
  );

drop function if exists public.is_blocked(uuid);

-- The grant this whole failure was about. Both roles need it: authenticated
-- to create a booking, anon because a policy referencing it can be planned
-- for an anonymous caller too.
grant execute on function public.is_blocked() to anon, authenticated;
