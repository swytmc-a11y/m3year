-- Miyar Rental — operator-editable settings and the add-on catalogue.

insert into public.app_settings (key, value) values
  -- Saudi VAT. Kept as a setting because rates change by decree, and a
  -- hardcoded 0.15 would mean an app release to follow one.
  ('vat_rate', '[0.15]'),
  -- Prices entered in the control panel already include VAT, matching the
  -- consumer price-display rule. Flip this if the operator ever prefers to
  -- enter net prices.
  ('prices_include_vat', '[true]'),
  ('weekly_threshold_days', '[7]'),
  ('monthly_threshold_days', '[30]'),
  -- How long an unpaid booking may hold a car before it is released.
  ('payment_window_minutes', '[30]'),
  -- How long the operator has to accept/reject a manual-confirmation
  -- booking before it is auto-resolved.
  ('confirmation_sla_hours', '[2]'),
  -- Cancellation: full refund up to N hours before pickup, partial after.
  ('cancellation_free_hours', '[24]'),
  ('cancellation_late_refund_percent', '[50]'),
  ('currency', '["SAR"]'),
  ('support_phone', '[""]'),
  ('support_whatsapp', '[""]')
on conflict (key) do nothing;

insert into public.addons (code, name, description, pricing_type, sort_order) values
  ('comprehensive_insurance', 'تأمين شامل',
   'تغطية شاملة للحوادث خلال مدة الإيجار.', 'per_day', 1),
  ('additional_driver', 'سائق إضافي',
   'إضافة سائق آخر مصرّح له بقيادة السيارة.', 'per_day', 2),
  ('unlimited_km', 'كيلومتر مفتوح',
   'بلا حد للكيلومترات ولا رسوم تجاوز.', 'per_day', 3),
  ('prepaid_fuel', 'وقود مدفوع مسبقًا',
   'خزان ممتلئ عند الاستلام، بلا حاجة لتعبئته قبل التسليم.', 'one_time', 4)
on conflict (code) do nothing;
