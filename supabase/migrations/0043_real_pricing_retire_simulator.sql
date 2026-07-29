-- Miyar (معيار) — real Paylink pricing; the simulator is retired.
--
-- A Paylink merchant account now exists, so the simulated payment path
-- (test_sim plan + mock-payment function) that let the promotion flow be
-- exercised before one existed is no longer needed.
--
-- Pricing: featured_7 = 5 SAR, featured_30 = 10 SAR. Both sit above Paylink's
-- documented 5 SAR minimum invoice — the first two prices tried (2 SAR /
-- 4 SAR) were below it and would have been rejected on the first real charge.

delete from public.promotion_orders where plan_code = 'test_sim';
delete from public.promotion_plans where code = 'test_sim';

update public.promotion_plans set price_halalas = 500  where code = 'featured_7';
update public.promotion_plans set price_halalas = 1000 where code = 'featured_30';

alter table public.promotion_plans drop column if exists is_test;
