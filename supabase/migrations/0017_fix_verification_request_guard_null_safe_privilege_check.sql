-- Fix security hole: v_is_privileged used bare `=` against a nullable
-- old.accountant_id, so it evaluated to NULL (not false) whenever the
-- request was unclaimed and the update didn't touch accountant_id. `if not
-- v_is_privileged` on a NULL condition is treated as false in PL/pgSQL, so
-- the intended "reject" branch was silently skipped and execution fell
-- through to `return new` unrestricted -- letting the owner set
-- status='completed' and fabricate verified_revenue on their own request.
create or replace function public.guard_verification_request_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_privileged boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'requested';
    new.accountant_id := null;
    new.fee_amount := null;
    new.verified_revenue := null;
    new.report_path := null;
    new.completed_at := null;
    new.financial_statement_path := null;
    return new;
  end if;

  if new.listing_id is distinct from old.listing_id
     or new.owner_id is distinct from old.owner_id
     or new.fee_amount is distinct from old.fee_amount then
    raise exception 'not authorized to modify protected verification request fields'
      using errcode = '42501';
  end if;

  -- Privileged path: the already-assigned accountant, or an active accountant
  -- claiming an unassigned request (old.accountant_id is null, new is themself).
  -- Null-safe: both branches require an explicit non-null match to auth.uid(),
  -- never relying on `NULL = auth.uid()` (which is NULL, not false).
  v_is_privileged := (old.accountant_id is not null and old.accountant_id = auth.uid())
    or (old.accountant_id is null and new.accountant_id is not null and new.accountant_id = auth.uid());

  if not v_is_privileged then
    if new.status is distinct from old.status
       or new.accountant_id is distinct from old.accountant_id
       or new.verified_revenue is distinct from old.verified_revenue
       or new.notes is distinct from old.notes
       or new.completed_at is distinct from old.completed_at
       or new.report_path is distinct from old.report_path then
      raise exception 'not authorized to modify verification request lifecycle fields'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status not in ('in_review', 'completed', 'rejected') then
    raise exception 'not authorized to set verification request status to %', new.status
      using errcode = '42501';
  end if;

  return new;
end;
$$;
