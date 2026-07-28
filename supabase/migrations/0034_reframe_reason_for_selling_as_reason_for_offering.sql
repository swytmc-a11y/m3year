-- Miyar (معيار) — reframes "سبب البيع" (reason for selling) as "سبب الطرح"
-- (reason for the offer). The platform's purpose isn't a full-sale
-- marketplace — it's connecting project owners with a strategic partner
-- (capital, or capital + hands-on work/expertise, per agreement). "Selling"
-- framing was wrong for that. Column name (`reason_for_selling`) is kept
-- unchanged — only the allowed values and the UI label change — to avoid a
-- wider blast radius across the schema, RLS, and every reader of this column.
--
-- New value set: expansion/development (التوسع/التطوير) and a renamed
-- liquidity_need (was financial_distress — same underlying case, phrased as
-- a normal capital need rather than a distress signal) become first-class
-- options alongside the previously-valid ones. `other` now pairs with a new
-- free-text `reason_for_selling_other` column instead of being a dead end.
--
-- Confirmed via the live table before writing this: 0 rows currently use
-- 'financial_distress', so the rename needs no data backfill.

alter table public.listings
  drop constraint listings_reason_for_selling_check;

alter table public.listings
  add constraint listings_reason_for_selling_check check (
    reason_for_selling is null or reason_for_selling in (
      'expansion', 'development', 'liquidity_need', 'new_venture',
      'partnership_dispute', 'retirement', 'relocation', 'other'
    )
  );

alter table public.listings
  add column reason_for_selling_other text
    check (reason_for_selling_other is null or char_length(reason_for_selling_other) <= 200);

alter table public.listings
  add constraint listings_reason_for_selling_other_required_check check (
    reason_for_selling is distinct from 'other'
    or (reason_for_selling_other is not null and char_length(reason_for_selling_other) > 0)
  );

-- Content edits to a published/rejected listing already re-open it for
-- review (guard_listing_protected_columns, migration 0007) by comparing a
-- fixed column list — reason_for_selling_other needs to join that list so an
-- edit to just the free-text reason doesn't silently skip re-review.
create or replace function public.guard_listing_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      raise exception 'not authorized to create a listing with status %', new.status
        using errcode = '42501';
    end if;
    new.verification_status := 'none';
    new.verified_at := null;
    new.is_featured := false;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  if new.status in ('published', 'rejected')
     and new.status is distinct from old.status then
    raise exception 'not authorized to approve or reject a listing'
      using errcode = '42501';
  end if;

  if new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.is_featured is distinct from old.is_featured
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'not authorized to modify protected listing fields'
      using errcode = '42501';
  end if;

  if old.status in ('published', 'rejected')
     and (new.title is distinct from old.title
          or new.sector is distinct from old.sector
          or new.city is distinct from old.city
          or new.monthly_revenue is distinct from old.monthly_revenue
          or new.offered_percentage is distinct from old.offered_percentage
          or new.description is distinct from old.description
          or new.reason_for_selling is distinct from old.reason_for_selling
          or new.reason_for_selling_other is distinct from old.reason_for_selling_other) then
    new.status := 'pending_review';
    new.reviewed_at := null;
    new.rejection_reason := null;
    if new.verification_status = 'verified' then
      new.verification_status := 'none';
      new.verified_at := null;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_listing_protected_columns() from public, anon, authenticated;
