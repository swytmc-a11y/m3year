import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { BookingCard, type BookingWithRelations } from "@/components/admin/booking-card";
import { cn } from "@/lib/utils";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/cars/constants";

const FILTERS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "pending_confirmation", label: BOOKING_STATUS_LABELS.pending_confirmation },
  { value: "confirmed", label: BOOKING_STATUS_LABELS.confirmed },
  { value: "active", label: BOOKING_STATUS_LABELS.active },
  { value: "completed", label: BOOKING_STATUS_LABELS.completed },
  { value: "pending_payment", label: BOOKING_STATUS_LABELS.pending_payment },
  { value: "cancelled", label: BOOKING_STATUS_LABELS.cancelled },
  { value: "all", label: "الكل" },
];

const SELECT =
  "id, reference, start_date, end_date, pickup_time, return_time, days, rate_tier, daily_rate, rental_total, addons_total, vat_amount, total, status, payment_status, customer_note, admin_note, cancellation_reason, refund_amount, car:cars(id, make, model, year), branch:branches(name, city), customer:profiles(id, full_name, phone, email, national_id, license_number, id_document_path, license_document_path, documents_check, documents_check_note, documents_approved_at)";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const active = status && FILTERS.some((f) => f.value === status) ? status : "pending_confirmation";
  const term = (q ?? "").trim();

  const supabase = await createClient();

  let query = supabase.from("bookings").select(SELECT).order("start_date", { ascending: true });
  if (active !== "all") query = query.eq("status", active as BookingStatus);
  // A phone call from a customer starts with a reference, so search it first.
  if (term) query = query.ilike("reference", `%${term}%`);

  const [{ data, error }, { data: allStatuses }] = await Promise.all([
    query.limit(200),
    supabase.from("bookings").select("status"),
  ]);

  const bookings = (data ?? []) as unknown as BookingWithRelations[];
  const counts = (allStatuses ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-admin-text">الحجوزات</h1>

      <form className="mb-6" action="/admin/bookings">
        <input type="hidden" name="status" value={active} />
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="ابحث برقم الحجز (مثال: MR-AB12CD)"
          className="h-11 w-full rounded-lg border border-admin-border bg-admin-surface px-4 text-sm text-admin-text placeholder:text-admin-text-muted"
        />
      </form>

      <div className="mb-8 flex gap-1 overflow-x-auto sm:gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/bookings?status=${f.value}`}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active === f.value
                ? "bg-admin-primary text-admin-on-primary"
                : "bg-admin-surface text-admin-text-muted hover:text-admin-text",
            )}
          >
            {f.label}
            {f.value !== "all" ? (
              <span className="ms-1 opacity-70">({counts[f.value] ?? 0})</span>
            ) : null}
          </Link>
        ))}
      </div>

      {error ? (
        <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
          تعذّر تحميل الحجوزات الآن.
        </Card>
      ) : bookings.length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          لا توجد حجوزات في هذا التصنيف.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}
