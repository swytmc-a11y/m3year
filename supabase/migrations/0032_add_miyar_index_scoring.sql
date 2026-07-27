-- Miyar (معيار) — مؤشر معيار: a deterministic, formula-driven score computed
-- server-side, never by an LLM. Every listing and franchise gets four stored
-- values recomputed automatically whenever their inputs change:
--
--   miyar_grade             text    'A' | 'B' | 'C' | 'D' | null (insufficient data)
--   miyar_quality_score     smallint 0-100  — business-metric quality (sector-aware, NOT exposed raw to end users as "the formula")
--   miyar_confidence_score  smallint 0-100  — how much the numbers can be trusted (verification-dominant)
--   miyar_completeness_pct  smallint 0-100  — how much of the optional disclosure is filled in
--
-- Design decisions locked in after review (see product discussion):
--   * Deterministic SQL only — no AI in the score path, so it never varies
--     between two computations of the same inputs.
--   * Sector-aware quality ranges — a single universal "healthy margin" range
--     across cafes, retail, and services would silently bias by sector.
--   * Confidence is verification-dominant (75% of its weight), completeness
--     contributes the rest — filling out fields is not the same as being true,
--     so completeness alone can never buy real confidence.
--   * A listing/franchise with under 30% completeness gets grade = null
--     ("بيانات غير كافية للتقييم") instead of a punitive D — an unfinished
--     draft is not the same thing as a weak project.
--   * formula_version is stored per row so a future recalibration is auditable
--     and backfillable, never a silent retroactive change.
--   * miyar_* columns are written ONLY by recompute_miyar_index_*() via the
--     miyar.internal_score_write session flag, or by an admin — never
--     directly by the owner's own client-side update, exactly like the
--     existing verification_status/is_featured guard pattern.

-- ---------------------------------------------------------------------------
-- 1) Columns
-- ---------------------------------------------------------------------------

alter table public.listings
  add column if not exists miyar_grade text check (miyar_grade in ('A', 'B', 'C', 'D')),
  add column if not exists miyar_quality_score smallint check (miyar_quality_score between 0 and 100),
  add column if not exists miyar_confidence_score smallint check (miyar_confidence_score between 0 and 100),
  add column if not exists miyar_completeness_pct smallint check (miyar_completeness_pct between 0 and 100),
  add column if not exists miyar_formula_version smallint,
  add column if not exists miyar_computed_at timestamptz;

alter table public.franchises
  add column if not exists miyar_grade text check (miyar_grade in ('A', 'B', 'C', 'D')),
  add column if not exists miyar_quality_score smallint check (miyar_quality_score between 0 and 100),
  add column if not exists miyar_confidence_score smallint check (miyar_confidence_score between 0 and 100),
  add column if not exists miyar_completeness_pct smallint check (miyar_completeness_pct between 0 and 100),
  add column if not exists miyar_formula_version smallint,
  add column if not exists miyar_computed_at timestamptz;

create index if not exists listings_miyar_grade_idx on public.listings (miyar_grade) where status = 'published';
create index if not exists franchises_miyar_grade_idx on public.franchises (miyar_grade) where status = 'published';

-- ---------------------------------------------------------------------------
-- 2) Guard: only the recompute functions (or an admin) may write these columns
-- ---------------------------------------------------------------------------

create or replace function public.guard_miyar_index_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('miyar.internal_score_write', true) = 'on' then
    return new; -- the recompute function itself is writing
  end if;
  if public.is_admin() then
    return new; -- admin dashboard may directly override (e.g. exclude a listing)
  end if;

  if tg_op = 'INSERT' then
    new.miyar_grade := null;
    new.miyar_quality_score := null;
    new.miyar_confidence_score := null;
    new.miyar_completeness_pct := null;
    new.miyar_formula_version := null;
    new.miyar_computed_at := null;
    return new;
  end if;

  new.miyar_grade := old.miyar_grade;
  new.miyar_quality_score := old.miyar_quality_score;
  new.miyar_confidence_score := old.miyar_confidence_score;
  new.miyar_completeness_pct := old.miyar_completeness_pct;
  new.miyar_formula_version := old.miyar_formula_version;
  new.miyar_computed_at := old.miyar_computed_at;
  return new;
end;
$$;

revoke execute on function public.guard_miyar_index_columns() from public, anon, authenticated;

drop trigger if exists listings_guard_miyar_index on public.listings;
create trigger listings_guard_miyar_index
  before insert or update on public.listings
  for each row execute function public.guard_miyar_index_columns();

drop trigger if exists franchises_guard_miyar_index on public.franchises;
create trigger franchises_guard_miyar_index
  before insert or update on public.franchises
  for each row execute function public.guard_miyar_index_columns();

-- ---------------------------------------------------------------------------
-- 3) Listings: recompute function (formula version 1)
-- ---------------------------------------------------------------------------

create or replace function public.recompute_miyar_index_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.listings%rowtype;
  conf public.listing_confidential%rowtype;
  completeness_pts int := 0;
  verification_pts int := 0;
  confidence_pts int := 0;
  quality_pts int := 0;
  months_since_verified numeric;
  profit_margin numeric;
  margin_lo numeric;
  margin_hi numeric;
  composite numeric;
  grade text;
begin
  select * into l from public.listings where id = p_listing_id;
  if not found then
    return;
  end if;

  select * into conf from public.listing_confidential where listing_id = p_listing_id;

  -- ---- اكتمال البيانات: 10 حقول، 10 نقاط لكل حقل ----
  if l.description is not null and char_length(l.description) >= 100 then completeness_pts := completeness_pts + 10; end if;
  if coalesce(array_length(l.photo_urls, 1), 0) >= 2 then completeness_pts := completeness_pts + 10; end if;
  if l.monthly_profit is not null then completeness_pts := completeness_pts + 10; end if;
  if l.founding_year is not null then completeness_pts := completeness_pts + 10; end if;
  if l.employee_count is not null then completeness_pts := completeness_pts + 10; end if;
  if l.reason_for_selling is not null then completeness_pts := completeness_pts + 10; end if;
  if conf.entity_type is not null then completeness_pts := completeness_pts + 10; end if;
  if conf.commercial_registration_number is not null then completeness_pts := completeness_pts + 10; end if;
  if l.asking_price is not null then completeness_pts := completeness_pts + 10; end if;
  if l.financial_data_sharing is not null then completeness_pts := completeness_pts + 10; end if;

  -- ---- التوثيق: يهيمن على درجة الثقة ----
  if l.verification_status = 'verified' then
    months_since_verified := extract(epoch from (now() - coalesce(l.verified_at, l.created_at))) / (30.0 * 24 * 3600);
    verification_pts := case when months_since_verified <= 12 then 60 else 45 end;
  elsif l.verification_status = 'pending' then
    verification_pts := 25;
  elsif l.verification_status = 'rejected' then
    verification_pts := 0;
  else
    verification_pts := 10;
  end if;

  -- ---- درجة الثقة = التوثيق (وزن أعلى) + الاكتمال (وزن أقل) ----
  confidence_pts := least(100, round(verification_pts + completeness_pts * 0.25)::int);

  -- ---- درجة الجودة: نطاقات بحسب القطاع، غير منشورة للمستخدم كصيغة ----
  quality_pts := 40; -- خط أساس

  if l.monthly_profit is not null and l.monthly_revenue > 0 then
    profit_margin := l.monthly_profit / l.monthly_revenue;
    case l.sector
      when 'cafe' then margin_lo := 0.10; margin_hi := 0.25;
      when 'restaurant' then margin_lo := 0.08; margin_hi := 0.20;
      when 'retail' then margin_lo := 0.05; margin_hi := 0.15;
      when 'services' then margin_lo := 0.15; margin_hi := 0.35;
      else margin_lo := 0.08; margin_hi := 0.25;
    end case;
    if profit_margin >= margin_lo and profit_margin <= margin_hi then
      quality_pts := quality_pts + 30;
    elsif profit_margin > 0 then
      quality_pts := quality_pts + 15;
    end if;
  end if;

  -- نسبة مطروحة معقولة (نطاق واحد لكل القطاعات — مجال تفاوض تجاري عام، ليس مقياسًا ماليًا يختلف بالقطاع)
  if l.offered_percentage >= 10 and l.offered_percentage <= 40 then
    quality_pts := quality_pts + 20;
  elsif l.offered_percentage > 0 and l.offered_percentage <= 60 then
    quality_pts := quality_pts + 10;
  end if;

  -- عمر المشروع: وزن محدود ومقصود — القِدَم وحده ليس مؤشر جودة قويًا
  if l.founding_year is not null and l.founding_year <= extract(year from now())::int - 2 then
    quality_pts := quality_pts + 10;
  end if;

  quality_pts := least(100, quality_pts);

  -- ---- التقييم النهائي ----
  if completeness_pts < 30 then
    grade := null; -- بيانات غير كافية للتقييم
  else
    composite := quality_pts * 0.5 + confidence_pts * 0.5;
    grade := case
      when composite >= 85 then 'A'
      when composite >= 70 then 'B'
      when composite >= 50 then 'C'
      else 'D'
    end;
  end if;

  perform set_config('miyar.internal_score_write', 'on', true);
  update public.listings
  set miyar_grade = grade,
      miyar_quality_score = quality_pts,
      miyar_confidence_score = confidence_pts,
      miyar_completeness_pct = completeness_pts,
      miyar_formula_version = 1,
      miyar_computed_at = now()
  where id = p_listing_id;
  perform set_config('miyar.internal_score_write', 'off', true);
end;
$$;

revoke execute on function public.recompute_miyar_index_listing(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Franchises: recompute function (formula version 1, franchise-shaped inputs)
-- ---------------------------------------------------------------------------

create or replace function public.recompute_miyar_index_franchise(p_franchise_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.franchises%rowtype;
  conf public.franchise_confidential%rowtype;
  completeness_pts int := 0;
  verification_pts int := 0;
  confidence_pts int := 0;
  quality_pts int := 0;
  months_since_verified numeric;
  royalty_lo numeric;
  royalty_hi numeric;
  composite numeric;
  grade text;
begin
  select * into f from public.franchises where id = p_franchise_id;
  if not found then
    return;
  end if;

  select * into conf from public.franchise_confidential where franchise_id = p_franchise_id;

  -- ---- اكتمال البيانات: 10 حقول، 10 نقاط لكل حقل ----
  if f.description is not null and char_length(f.description) >= 100 then completeness_pts := completeness_pts + 10; end if;
  if coalesce(array_length(f.photo_urls, 1), 0) >= 1 or f.logo_url is not null then completeness_pts := completeness_pts + 10; end if;
  if f.initial_investment_min is not null and f.initial_investment_max is not null then completeness_pts := completeness_pts + 10; end if;
  if f.royalty_percentage is not null then completeness_pts := completeness_pts + 10; end if;
  if f.required_space_sqm is not null then completeness_pts := completeness_pts + 10; end if;
  if f.required_employees_count is not null then completeness_pts := completeness_pts + 10; end if;
  if f.expected_payback_months is not null then completeness_pts := completeness_pts + 10; end if;
  if conf.entity_type is not null then completeness_pts := completeness_pts + 10; end if;
  if conf.commercial_registration_number is not null then completeness_pts := completeness_pts + 10; end if;
  if coalesce(array_length(f.cities_available, 1), 0) >= 1 then completeness_pts := completeness_pts + 10; end if;

  -- ---- التوثيق ----
  if f.verification_status = 'verified' then
    months_since_verified := extract(epoch from (now() - coalesce(f.verified_at, f.created_at))) / (30.0 * 24 * 3600);
    verification_pts := case when months_since_verified <= 12 then 60 else 45 end;
  elsif f.verification_status = 'pending' then
    verification_pts := 25;
  elsif f.verification_status = 'rejected' then
    verification_pts := 0;
  else
    verification_pts := 10;
  end if;

  confidence_pts := least(100, round(verification_pts + completeness_pts * 0.25)::int);

  -- ---- درجة الجودة: مدخلات الامتياز (رسوم/إتاوة/استرداد/تدريب) ----
  quality_pts := 40;

  if f.royalty_percentage is not null then
    case f.sector
      when 'cafe' then royalty_lo := 3; royalty_hi := 8;
      when 'restaurant' then royalty_lo := 4; royalty_hi := 9;
      when 'retail' then royalty_lo := 2; royalty_hi := 6;
      when 'services' then royalty_lo := 5; royalty_hi := 12;
      else royalty_lo := 3; royalty_hi := 8;
    end case;
    if f.royalty_percentage >= royalty_lo and f.royalty_percentage <= royalty_hi then
      quality_pts := quality_pts + 20;
    elsif f.royalty_percentage > 0 then
      quality_pts := quality_pts + 10;
    end if;
  end if;

  if f.expected_payback_months is not null then
    if f.expected_payback_months between 12 and 36 then
      quality_pts := quality_pts + 20;
    elsif f.expected_payback_months between 6 and 48 then
      quality_pts := quality_pts + 10;
    end if;
  end if;

  if f.training_provided then
    quality_pts := quality_pts + 10;
  end if;

  if f.current_branches_count is not null and f.current_branches_count >= 2 then
    quality_pts := quality_pts + 10;
  end if;

  quality_pts := least(100, quality_pts);

  if completeness_pts < 30 then
    grade := null;
  else
    composite := quality_pts * 0.5 + confidence_pts * 0.5;
    grade := case
      when composite >= 85 then 'A'
      when composite >= 70 then 'B'
      when composite >= 50 then 'C'
      else 'D'
    end;
  end if;

  perform set_config('miyar.internal_score_write', 'on', true);
  update public.franchises
  set miyar_grade = grade,
      miyar_quality_score = quality_pts,
      miyar_confidence_score = confidence_pts,
      miyar_completeness_pct = completeness_pts,
      miyar_formula_version = 1,
      miyar_computed_at = now()
  where id = p_franchise_id;
  perform set_config('miyar.internal_score_write', 'off', true);
end;
$$;

revoke execute on function public.recompute_miyar_index_franchise(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Triggers: recompute automatically whenever the inputs change
-- ---------------------------------------------------------------------------

create or replace function public.trg_recompute_miyar_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_miyar_index_listing(new.id);
  return new;
end;
$$;

revoke execute on function public.trg_recompute_miyar_listing() from public, anon, authenticated;

drop trigger if exists listings_recompute_miyar on public.listings;
create trigger listings_recompute_miyar
  after insert or update of
    monthly_revenue, offered_percentage, monthly_profit, founding_year, employee_count,
    description, photo_urls, reason_for_selling, asking_price, financial_data_sharing,
    sector, verification_status, verified_at
  on public.listings
  for each row execute function public.trg_recompute_miyar_listing();

create or replace function public.trg_recompute_miyar_listing_from_confidential()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_miyar_index_listing(new.listing_id);
  return new;
end;
$$;

revoke execute on function public.trg_recompute_miyar_listing_from_confidential() from public, anon, authenticated;

drop trigger if exists listing_confidential_recompute_miyar on public.listing_confidential;
create trigger listing_confidential_recompute_miyar
  after insert or update of entity_type, commercial_registration_number
  on public.listing_confidential
  for each row execute function public.trg_recompute_miyar_listing_from_confidential();

create or replace function public.trg_recompute_miyar_franchise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_miyar_index_franchise(new.id);
  return new;
end;
$$;

revoke execute on function public.trg_recompute_miyar_franchise() from public, anon, authenticated;

drop trigger if exists franchises_recompute_miyar on public.franchises;
create trigger franchises_recompute_miyar
  after insert or update of
    initial_investment_min, initial_investment_max, royalty_percentage, required_space_sqm,
    required_employees_count, expected_payback_months, training_provided, current_branches_count,
    description, photo_urls, logo_url, cities_available, sector, verification_status, verified_at
  on public.franchises
  for each row execute function public.trg_recompute_miyar_franchise();

create or replace function public.trg_recompute_miyar_franchise_from_confidential()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_miyar_index_franchise(new.franchise_id);
  return new;
end;
$$;

revoke execute on function public.trg_recompute_miyar_franchise_from_confidential() from public, anon, authenticated;

drop trigger if exists franchise_confidential_recompute_miyar on public.franchise_confidential;
create trigger franchise_confidential_recompute_miyar
  after insert or update of entity_type, commercial_registration_number
  on public.franchise_confidential
  for each row execute function public.trg_recompute_miyar_franchise_from_confidential();

-- ---------------------------------------------------------------------------
-- 6) Backfill: score every existing row once, and expose an admin-only
--    recompute-all for whenever formula_version is bumped in the future.
-- ---------------------------------------------------------------------------

create or replace function public.recompute_all_miyar_index()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  for r in select id from public.listings loop
    perform public.recompute_miyar_index_listing(r.id);
  end loop;
  for r in select id from public.franchises loop
    perform public.recompute_miyar_index_franchise(r.id);
  end loop;
end;
$$;

grant execute on function public.recompute_all_miyar_index() to authenticated;

do $$
declare
  r record;
begin
  for r in select id from public.listings loop
    perform public.recompute_miyar_index_listing(r.id);
  end loop;
  for r in select id from public.franchises loop
    perform public.recompute_miyar_index_franchise(r.id);
  end loop;
end;
$$;
