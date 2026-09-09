import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSar } from "@/lib/cars/constants";

type Stat = {
  href: string;
  label: string;
  value: string;
  urgent?: boolean;
};

type Section = {
  title: string;
  description: string;
  stats: Stat[];
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [
    { count: pendingConfirmation },
    { count: pendingPayment },
    { count: todayPickups },
    { count: todayReturns },
    { count: activeRentals },
    { count: totalCars },
    { count: availableCars },
    { count: maintenanceCars },
    { count: branches },
    { count: customers },
    { data: paidThisMonth },
  ] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending_confirmation"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("start_date", today).in("status", ["confirmed", "active"]),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("end_date", today).in("status", ["confirmed", "active"]),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("cars").select("id", { count: "exact", head: true }),
    supabase.from("cars").select("id", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("cars").select("id", { count: "exact", head: true }).eq("status", "maintenance"),
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase
      .from("bookings")
      .select("total")
      .eq("payment_status", "paid")
      .gte("start_date", monthStart),
  ]);

  const monthRevenue = (paidThisMonth ?? []).reduce((sum, b) => sum + Number(b.total), 0);

  const sections: Section[] = [
    {
      title: "يحتاجك الآن",
      description: "عمليات معلّقة على ردّك.",
      stats: [
        {
          href: "/admin/bookings?status=pending_confirmation",
          label: "حجوزات بانتظار تأكيدك",
          value: String(pendingConfirmation ?? 0),
          urgent: (pendingConfirmation ?? 0) > 0,
        },
        {
          href: "/admin/bookings?status=pending_payment",
          label: "حجوزات بانتظار الدفع",
          value: String(pendingPayment ?? 0),
        },
      ],
    },
    {
      title: "حركة اليوم",
      description: "ما يحدث في الفروع اليوم.",
      stats: [
        {
          href: "/admin/today",
          label: "استلامات اليوم",
          value: String(todayPickups ?? 0),
          urgent: (todayPickups ?? 0) > 0,
        },
        {
          href: "/admin/today",
          label: "تسليمات اليوم",
          value: String(todayReturns ?? 0),
          urgent: (todayReturns ?? 0) > 0,
        },
        {
          href: "/admin/bookings?status=active",
          label: "إيجارات جارية",
          value: String(activeRentals ?? 0),
        },
      ],
    },
    {
      title: "الأسطول",
      description: "سيارة واقفة = خسارة.",
      stats: [
        { href: "/admin/cars", label: "إجمالي السيارات", value: String(totalCars ?? 0) },
        { href: "/admin/cars?status=available", label: "متاحة", value: String(availableCars ?? 0) },
        {
          href: "/admin/cars?status=maintenance",
          label: "في الصيانة",
          value: String(maintenanceCars ?? 0),
          urgent: (maintenanceCars ?? 0) > 0,
        },
        { href: "/admin/branches", label: "فروع نشطة", value: String(branches ?? 0) },
      ],
    },
    {
      title: "النمو والإيراد",
      description: "هذا الشهر.",
      stats: [
        { href: "/admin/bookings", label: "إيراد الحجوزات المدفوعة", value: formatSar(monthRevenue) },
        { href: "/admin/users", label: "إجمالي العملاء", value: String(customers ?? 0) },
      ],
    },
  ];

  const noFleetYet = (branches ?? 0) === 0 || (totalCars ?? 0) === 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-10 font-heading text-2xl font-extrabold text-admin-text">نظرة عامة</h1>

      {noFleetYet ? (
        <Card className="mb-10 border-admin-primary/30 bg-admin-primary/5 p-5 sm:p-6">
          <h2 className="mb-1 font-heading text-base font-extrabold text-admin-text">ابدأ من هنا</h2>
          <p className="mb-4 text-[13px] leading-6 text-admin-text-muted">
            التطبيق لا يعرض شيئًا حتى يوجد فرع وسيارة. أضف فرعًا أولًا، ثم أضف سياراته.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/branches/new"
              className="rounded-lg bg-admin-primary px-4 py-2 text-sm font-bold text-admin-on-primary"
            >
              إضافة فرع
            </Link>
            <Link
              href="/admin/cars/new"
              className="rounded-lg border border-admin-border px-4 py-2 text-sm font-bold text-admin-text"
            >
              إضافة سيارة
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-10">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-base font-extrabold text-admin-text">{section.title}</h2>
              <span className="text-[12px] text-admin-text-muted">{section.description}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {section.stats.map((stat) => (
                <Link key={stat.href + stat.label} href={stat.href}>
                  <Card className="flex h-full flex-col gap-2 border-admin-border bg-admin-surface p-4 transition-shadow hover:shadow-[0_4px_16px_rgba(20,22,26,0.08)] sm:p-6">
                    <div
                      className={cn(
                        "font-mono text-2xl font-extrabold sm:text-3xl",
                        stat.urgent ? "text-admin-amber" : "text-admin-text",
                      )}
                    >
                      {stat.value}
                    </div>
                    <div className="text-[13px] leading-6 text-admin-text-muted">{stat.label}</div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
