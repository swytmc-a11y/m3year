-- The app offered a "reminders" notification preference, but nothing ever
-- sent one — the toggle promised a feature that did not exist. This is that
-- feature: a reminder the day before pickup, and the day before the car is
-- due back.

-- Sent-markers live on the booking so a reminder cannot be sent twice, no
-- matter how often the sweep runs or how it is retried.
alter table public.bookings
  add column if not exists pickup_reminded_at timestamptz,
  add column if not exists return_reminded_at timestamptz;

create or replace function public.send_booking_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  -- Pickup tomorrow, for bookings actually going ahead.
  for v_row in
    select b.id, b.reference, b.customer_id, b.pickup_time, br.name as branch_name
    from public.bookings b
    join public.branches br on br.id = b.branch_id
    left join public.notification_preferences np on np.user_id = b.customer_id
    where b.status in ('confirmed', 'pending_confirmation')
      and b.start_date = current_date + 1
      and b.pickup_reminded_at is null
      -- No preferences row means everything is on, so only an explicit false
      -- suppresses the reminder.
      and coalesce(np.reminders, true)
  loop
    insert into public.notifications (user_id, category, title, body, data)
    values (
      v_row.customer_id,
      'reminders',
      'استلام سيارتك غدًا',
      format('حجزك %s — الاستلام غدًا من %s%s.', v_row.reference, v_row.branch_name,
             case when v_row.pickup_time is not null
                  then ' الساعة ' || to_char(v_row.pickup_time, 'HH24:MI') else '' end),
      jsonb_build_object('booking_id', v_row.id)
    );
    update public.bookings set pickup_reminded_at = now() where id = v_row.id;
    v_count := v_count + 1;
  end loop;

  -- Car due back tomorrow. Only for rentals already under way — a booking
  -- that never started has nothing to return.
  for v_row in
    select b.id, b.reference, b.customer_id, b.return_time, br.name as branch_name
    from public.bookings b
    join public.branches br on br.id = b.branch_id
    left join public.notification_preferences np on np.user_id = b.customer_id
    where b.status = 'active'
      and b.end_date = current_date + 1
      and b.return_reminded_at is null
      and coalesce(np.reminders, true)
  loop
    insert into public.notifications (user_id, category, title, body, data)
    values (
      v_row.customer_id,
      'reminders',
      'تسليم السيارة غدًا',
      format('حجزك %s — التسليم غدًا إلى %s%s.', v_row.reference, v_row.branch_name,
             case when v_row.return_time is not null
                  then ' الساعة ' || to_char(v_row.return_time, 'HH24:MI') else '' end),
      jsonb_build_object('booking_id', v_row.id)
    );
    update public.bookings set return_reminded_at = now() where id = v_row.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Same reasoning as the other maintenance functions: this is called by the
-- scheduler, never by a client, so nothing outside the database may execute
-- it. Postgres grants EXECUTE to PUBLIC by default on new functions, so
-- revoking from anon/authenticated alone would not be enough.
revoke execute on function public.send_booking_reminders() from public;
revoke execute on function public.send_booking_reminders() from anon, authenticated;

-- 06:00 UTC is 09:00 in Riyadh — a reminder that lands the morning before,
-- not at 3am.
select cron.schedule(
  'send-booking-reminders',
  '0 6 * * *',
  $$select public.send_booking_reminders()$$
);
