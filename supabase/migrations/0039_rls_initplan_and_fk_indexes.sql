-- Miyar (معيار) — database performance pass.
--
-- Two changes, both semantically neutral (no policy grants anything it did
-- not grant before, no row becomes visible that was not visible before).
--
-- 1) RLS initplan. 48 policies called auth.uid() directly. Postgres treats a
--    bare function call in a policy expression as something to evaluate for
--    every candidate row, so scanning N rows meant N calls. Wrapping it as
--    (select auth.uid()) turns it into an InitPlan that runs once per query
--    and is reused for every row. The value is identical — auth.uid() is
--    stable within a statement — so this is purely how often it is computed.
--    Invisible at 50 rows; the difference between a fast and an unusable
--    feed at 50,000.
--
-- 2) Missing foreign-key indexes. Six FK columns had no covering index, so
--    every cascade check and every join through them was a sequential scan.
--
-- Deliberately NOT done here: dropping the nine indexes the linter reports
-- as "unused". Statistics on this database only cover development traffic
-- since 2026-07-15 and the data was wiped part-way through; no real user has
-- ever exercised favorites, ai_reports or the audit log. An index that has
-- not been scanned because its feature has not shipped is not an unused
-- index, and dropping it would only mean recreating it later against a
-- larger table. Revisit once real usage statistics exist.

-- 1) Wrap auth.uid() in a scalar subquery across every public policy that
--    still calls it directly.
--
--    Done as a loop over the catalogue rather than 48 hand-written policy
--    definitions: the rewrite is a pure string substitution on the existing
--    expression, so regenerating from pg_policies guarantees the new policy
--    differs from the old one in exactly that one respect and nothing else.
--    Hand-copying 48 multi-clause expressions is where a subtle permission
--    change would slip in unnoticed.
--
--    Idempotency note: Postgres re-renders (select auth.uid()) as
--    "( SELECT auth.uid() AS uid)", which still contains the literal
--    "auth.uid()". Matching on that alone would re-wrap an already-wrapped
--    policy on every run, nesting subqueries forever. The SELECT-form
--    exclusion below is what makes re-running a genuine no-op.
do $$
declare
  p record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (qual like '%auth.uid()%' and qual not like '%SELECT auth.uid()%')
        or (with_check like '%auth.uid()%' and with_check not like '%SELECT auth.uid()%')
      )
  loop
    new_qual := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    new_check := replace(p.with_check, 'auth.uid()', '(select auth.uid())');

    execute format('drop policy %I on public.%I', p.policyname, p.tablename);

    stmt := format(
      'create policy %I on public.%I as %s for %s to %s',
      p.policyname,
      p.tablename,
      case when p.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
      lower(p.cmd),
      array_to_string(p.roles, ', ')
    );
    if new_qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;

    execute stmt;
  end loop;
end $$;

-- 2) Cover the six foreign keys that had no index.
create index if not exists ai_reports_requested_by_idx
  on public.ai_reports (requested_by);
create index if not exists favorites_listing_id_idx
  on public.favorites (listing_id);
create index if not exists franchise_confidential_owner_id_idx
  on public.franchise_confidential (owner_id);
create index if not exists listing_confidential_owner_id_idx
  on public.listing_confidential (owner_id);
create index if not exists ratings_listing_id_idx
  on public.ratings (listing_id);
create index if not exists reports_reporter_id_idx
  on public.reports (reporter_id);

-- 3) Index the feed's actual access path. The home feed filters on
--    status='published' and orders by is_featured, created_at — a partial
--    index on exactly that keeps the paginated query off a full scan as the
--    catalogue grows.
create index if not exists listings_published_feed_idx
  on public.listings (is_featured desc, created_at desc)
  where status = 'published';
create index if not exists franchises_published_feed_idx
  on public.franchises (is_featured desc, created_at desc)
  where status = 'published';
