-- The live constraint had drifted from migration 0016 (an ad-hoc ALTER
-- applied directly to the live project at some point never made it into a
-- migration file): it allowed a completely different set of English values
-- (financial_gain/health_reasons/lifestyle_change/lack_of_time/
-- business_challenges) than what the app actually sends
-- (retirement/relocation/new_venture/partnership_dispute/financial_distress/
-- other). Every listing submission with any reason_for_selling other than
-- 'new_venture' was rejected by this check constraint. Restoring it to match
-- 0016 and the app's reasonForSellingEnum.
alter table public.listings
  drop constraint listings_reason_for_selling_check;

alter table public.listings
  add constraint listings_reason_for_selling_check check (
    reason_for_selling is null or reason_for_selling in (
      'retirement', 'relocation', 'new_venture', 'partnership_dispute', 'financial_distress', 'other'
    )
  );
