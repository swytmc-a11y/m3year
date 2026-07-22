import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: totalListings },
    { count: pendingListings },
    { count: openVerifications },
    { count: pendingAccountants },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "requested"),
    supabase
      .from("accountants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      href: "/admin/listings",
      label: "إعلانات بانتظار المراجعة",
      count: pendingListings ?? 0,
      urgent: (pendingListings ?? 0) > 0,
    },
    {
      href: "/admin/all-listings",
      label: "كل الإعلانات (تحكّم كامل)",
      count: totalListings ?? 0,
      urgent: false,
    },
    {
      href: "/admin/verification-requests",
      label: "طلبات توثيق بانتظار الإسناد",
      count: openVerifications ?? 0,
      urgent: (openVerifications ?? 0) > 0,
    },
    {
      href: "/admin/accountants",
      label: "محاسبون بانتظار التفعيل",
      count: pendingAccountants ?? 0,
      urgent: (pendingAccountants ?? 0) > 0,
    },
    {
      href: "/admin/users",
      label: "كل الحسابات",
      count: totalUsers ?? 0,
      urgent: false,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-verify">
        لوحة الإدارة
      </div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-ink">
        نظرة عامة
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.href} href={stat.href}>
            <Card className="flex h-full flex-col gap-2 p-4 transition-shadow hover:shadow-sm sm:p-6">
              <div
                className={
                  stat.urgent
                    ? "font-mono text-3xl font-extrabold text-amber"
                    : "font-mono text-3xl font-extrabold text-ink"
                }
              >
                {stat.count}
              </div>
              <div className="text-[13px] leading-6 text-ink/60">
                {stat.label}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
