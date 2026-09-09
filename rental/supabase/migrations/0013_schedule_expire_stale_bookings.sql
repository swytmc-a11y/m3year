-- expire_stale_bookings() existed and the "payment window" setting was
-- configurable, but nothing ever called it — so an unpaid booking held its
-- dates against the overlap constraint permanently and quietly took the car
-- off the market. Expiring moves the row out of the constraint's WHERE
-- clause, which is what actually frees the dates.
create extension if not exists pg_cron with schema cron;

-- Every five minutes: fine-grained enough that a 30-minute payment window
-- means roughly what it says, cheap enough to be irrelevant (one indexed
-- UPDATE over a handful of rows).
select cron.schedule(
  'expire-stale-bookings',
  '*/5 * * * *',
  $$select public.expire_stale_bookings()$$
);
