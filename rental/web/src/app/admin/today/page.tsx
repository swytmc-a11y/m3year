import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { BookingCard, type BookingWithRelations } from "@/components/admin/booking-card";
import { formatDate } from "@/lib/cars/constants";

const SELECT =
  "id, reference, start_date, end_date, pickup_time, return_time, days, rate_tier, daily_rate, rental_total, addons_total, vat_amount, total, status, payment_status, customer_note, admin_note, cancellation_reason, refund_amount, car:cars(id, make, model, year), branch:branches(name, city), customer:profiles(full_name, phone, email)";

/**
 * The counter view: who is collecting a car today, who is bringing one back,
 * and what is overdue. This is the page a branch actually works from.
 */
export default async function AdminTodayPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: pickups }, { data: returns }, { data: overdue }] = await Promise.all([
    supabase
      .from("bookings")
      .select(SELECT)
      .eq("start_date", today)
      .in("status", ["confirmed", "pending_confirmation"])
      .order("pickup_time"),
    supabase
      .from("bookings")
      .select(SELECT)
      .eq("end_date", today)
      .eq("status", "active")
      .order("return_time"),
    supabase
      .from("bookings")
      .select(SELECT)
      .lt("end_date", today)
      .eq("status", "active")
      .order("end_date"),
  ]);

  const sections: { title: string; description: string; rows: BookingWithRelations[]; urgent?: boolean }[] = [
    {
      title: "استلامات اليوم",
      description: "عملاء يستلمون سياراتهم اليوم.",
      rows: (pickups ?? []) as unknown as BookingWithRelations[],
    },
    {
      title: "تسليمات اليوم",
      description: "سيارات تعود اليوم.",
      rows: (returns ?? []) as unknown as BookingWithRelations[],
    },
    {
      title: "متأخرة",
      description: "تجاوزت موعد التسليم ولم تُستلم بعد.",
      rows: (overdue ?? []) as unknown as BookingWithRelations[],
      urgent: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-admin-text">حركة اليوم</h1>
      <p className="mb-10 text-[13px] text-admin-text-muted">{formatDate(today)}</p>

      <div className="flex flex-col gap-10">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2
                className={
                  section.urgent && section.rows.length > 0
                    ? "font-heading text-base font-extrabold text-admin-amber"
                    : "font-heading text-base font-extrabold text-admin-text"
                }
              >
                {section.title}
                <span className="ms-2 text-sm font-normal text-admin-text-muted">
                  ({section.rows.length})
                </span>
              </h2>
              <span className="text-[12px] text-admin-text-muted">{section.description}</span>
            </div>

            {section.rows.length === 0 ? (
              <Card className="border-admin-border bg-admin-surface text-center text-[13px] text-admin-text-muted">
                لا شيء هنا.
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {section.rows.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
