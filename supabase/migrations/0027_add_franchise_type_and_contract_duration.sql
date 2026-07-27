alter table public.franchises
  add column franchise_type text not null default 'single_unit'
    check (franchise_type in ('single_unit', 'area_development')),
  add column contract_duration_years smallint
    check (contract_duration_years is null or contract_duration_years between 1 and 50);
