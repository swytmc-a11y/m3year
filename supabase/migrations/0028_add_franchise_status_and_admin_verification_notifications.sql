-- Notify franchise owner when review outcome changes (mirrors trg_notify_listing_status,
-- which listings already had but franchises were missing).
create or replace function public.trg_notify_franchise_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'published' then
      perform public.create_notification(
        new.owner_id, 'franchise_published', 'تم نشر امتيازك',
        'تمت الموافقة على "' || new.brand_name || '" وهو الآن مرئي للعامة.', new.id
      );
    elsif new.status = 'rejected' then
      perform public.create_notification(
        new.owner_id, 'franchise_rejected', 'تم رفض امتيازك',
        coalesce('سبب الرفض: ' || new.rejection_reason, 'راجع تفاصيل الامتياز لمزيد من المعلومات.'), new.id
      );
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_notify_franchise_status() from public, anon, authenticated;

create trigger notify_franchise_status_change
  after update on public.franchises
  for each row execute function public.trg_notify_franchise_status();

-- Notify all admins when a new verification request is submitted, so they don't
-- have to poll the admin queue manually.
create or replace function public.trg_notify_verification_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin record;
  v_target text;
begin
  v_target := case when new.listing_id is not null then 'مشروع' else 'امتياز' end;
  for v_admin in select id from public.profiles where role = 'admin' loop
    perform public.create_notification(
      v_admin.id, 'verification_request_created', 'طلب توثيق جديد',
      'طلب توثيق مالي جديد لـ' || v_target || ' بانتظار الإسناد.',
      coalesce(new.listing_id, new.franchise_id)
    );
  end loop;
  return new;
end;
$$;
revoke execute on function public.trg_notify_verification_request_created() from public, anon, authenticated;

create trigger notify_verification_request_created_insert
  after insert on public.verification_requests
  for each row execute function public.trg_notify_verification_request_created();
