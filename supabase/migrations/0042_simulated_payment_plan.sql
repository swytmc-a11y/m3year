-- Miyar (معيار) — a simulated payment path.
--
-- The promotion flow needs to be exercisable before a merchant account
-- exists: activating a real Saudi payment gateway requires either a
-- commercial registration or a freelance certificate plus a matching bank
-- account, and that approval can take days. Blocking all testing on it
-- would mean shipping the flow untested.
--
-- The gate is data, not an environment flag: only a plan explicitly marked
-- is_test routes to the simulator, and the mock-payment function refuses any
-- order whose plan is not is_test. A real priced plan therefore cannot be
-- settled by simulation even if a client asks for it. Deleting the test plan
-- disables the simulator entirely — no redeploy needed.
alter table public.promotion_plans
  add column if not exists is_test boolean not null default false;

insert into public.promotion_plans
  (code, name_ar, description_ar, duration_days, price_halalas, sort_order, is_test)
values
  ('test_sim', 'باقة تجريبية (محاكاة)',
   'للتجربة فقط — لا يوجد دفع حقيقي. تمييز لمدة يوم واحد.',
   1, 100, 99, true)
on conflict (code) do update
  set is_test = true,
      name_ar = excluded.name_ar,
      description_ar = excluded.description_ar;
