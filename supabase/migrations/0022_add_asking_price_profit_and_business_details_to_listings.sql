-- Owner-facing listing enrichment: an advertised asking price/required
-- amount (with a negotiable toggle), an optional profit figure the owner
-- can choose to publish or keep "available on contact", and two small
-- business-detail fields (founding year, employee count) that came up
-- repeatedly in the earlier competitor analysis as easy, low-risk wins.
--
-- Legal note: this remains an ADVERTISED figure only, same as
-- monthly_revenue/offered_percentage already were -- it does not change the
-- platform's role (listings + messaging + paid verification; the deal
-- itself is executed off-platform, per the standing note in 0001).
alter table public.listings
  add column asking_price numeric(14,2)
    check (asking_price is null or asking_price >= 0),
  add column price_negotiable boolean not null default true,
  add column monthly_profit numeric(12,2)
    check (monthly_profit is null or monthly_profit >= 0),
  add column show_profit boolean not null default false,
  add column founding_year smallint
    check (founding_year is null or founding_year between 1950 and 2100),
  add column employee_count smallint
    check (employee_count is null or employee_count >= 0);
