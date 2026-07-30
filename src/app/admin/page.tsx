import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

function formatSar(halalas: number): string {
  const riyals = halalas / 100;
  return `${Number.isInteger(riyals) ? riyals : riyals.toFixed(2)} ر.س`;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalListings },
    { count: pendingListings },
    { count: totalFranchises },
    { count: pendingFranchises },
    { count: openVerifications },
    { count: pendingAccountants },
    { count: totalUsers },
    { count: newUsersThisWeek },
    { count: openReports },
    { count: blockedUserPairs },
    { data: paidThisMonth },
  ] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("franchises").select("id", { count: "exact", head: true }),
    supabase.from("franchises").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("accountants").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("user_blocks").select("blocker_id", { count: "exact", head: true }),
    supabase
      .from("promotion_orders")
      .select("amount_halalas")
      .eq("status", "paid")
      .gte("paid_at", monthStart),
  ]);

  const monthRevenueHalalas = (paidThisMonth ?? []).reduce((sum, o) => sum + o.amount_halalas, 0);

  const sections: Section[] = [
    {
      title: "قائمة الانتظار",
      description: "يحتاج فعلًا منك الآن.",
      stats: [
        {
          href: "/admin/listings",
          label: "إعلانات بانتظار المراجعة",
          value: String(pendingListings ?? 0),
          urgent: (pendingListings ?? 0) > 0,
        },
        {
          href: "/admin/franchises",
          label: "امتيازات بانتظار المراجعة",
          value: String(pendingFranchises ?? 0),
          urgent: (pendingFranchises ?? 0) > 0,
        },
        {
          href: "/admin/verification-requests",
          label: "طلبات توثيق بانتظار الإسناد",
          value: String(openVerifications ?? 0),
          urgent: (openVerifications ?? 0) > 0,
        },
        {
          href: "/admin/accountants",
          label: "محاسبون بانتظار التفعيل",
          value: String(pendingAccountants ?? 0),
          urgent: (pendingAccountants ?? 0) > 0,
        },
      ],
    },
    {
      title: "الثقة والسلامة",
      description: "بلاغات وحظر بين المستخدمين.",
      stats: [
        {
          href: "/admin/reports",
          label: "بلاغات مفتوحة",
          value: String(openReports ?? 0),
          urgent: (openReports ?? 0) > 0,
        },
        {
          href: "/admin/users",
          label: "حالات حظر بين مستخدمين (تراكمي)",
          value: String(blockedUserPairs ?? 0),
        },
      ],
    },
    {
      title: "النمو والإيراد",
      description: "هذا الشهر.",
      stats: [
        {
          href: "/admin/all-listings",
          label: "إيراد التمييز هذا الشهر",
          value: formatSar(monthRevenueHalalas),
        },
        {
          href: "/admin/users",
          label: "حسابات جديدة آخر 7 أيام",
          value: String(newUsersThisWeek ?? 0),
        },
      ],
    },
    {
      title: "الكتالوج",
      description: "الحجم الكلي.",
      stats: [
        { href: "/admin/all-listings", label: "كل الإعلانات", value: String(totalListings ?? 0) },
        { href: "/admin/all-franchises", label: "كل الامتيازات", value: String(totalFranchises ?? 0) },
        { href: "/admin/users", label: "كل الحسابات", value: String(totalUsers ?? 0) },
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">
        لوحة الإدارة
      </div>
      <h1 className="mb-10 font-heading text-2xl font-extrabold text-admin-text">
        نظرة عامة
      </h1>

      <div className="flex flex-col gap-10">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-base font-extrabold text-admin-text">
                {section.title}
              </h2>
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
                    <div className="text-[13px] leading-6 text-admin-text-muted">
                      {stat.label}
                    </div>
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
