import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markReportReviewed, dismissReport } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/listings/constants";

type ReportRow = {
  id: string;
  target_type: "listing" | "franchise" | "user";
  target_id: string;
  reason: string;
  status: "open" | "reviewed" | "dismissed";
  created_at: string;
  reporter: { full_name: string | null } | null;
};

const STATUS_LABEL: Record<ReportRow["status"], string> = {
  open: "مفتوح",
  reviewed: "تمت المراجعة",
  dismissed: "مرفوض",
};

const TARGET_TYPE_LABEL: Record<ReportRow["target_type"], string> = {
  listing: "إعلان",
  franchise: "امتياز",
  user: "مستخدم",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status === "all" ? null : (status ?? "open");

  const supabase = await createClient();

  let query = supabase
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (filter) query = query.eq("status", filter);

  const { data, error } = await query;
  const reports = (data ?? []) as unknown as ReportRow[];

  // No FK ties target_id to a specific table (it names one of three
  // depending on target_type), so the display title for each target is
  // resolved with three small batched lookups instead of a join.
  const listingIds = reports.filter((r) => r.target_type === "listing").map((r) => r.target_id);
  const franchiseIds = reports.filter((r) => r.target_type === "franchise").map((r) => r.target_id);
  const userIds = reports.filter((r) => r.target_type === "user").map((r) => r.target_id);

  const [{ data: listings }, { data: franchises }, { data: users }] = await Promise.all([
    listingIds.length
      ? supabase.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    franchiseIds.length
      ? supabase.from("franchises").select("id, brand_name").in("id", franchiseIds)
      : Promise.resolve({ data: [] as { id: string; brand_name: string }[] }),
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const listingTitle = new Map((listings ?? []).map((l) => [l.id, l.title]));
  const franchiseName = new Map((franchises ?? []).map((f) => [f.id, f.brand_name]));
  const userName = new Map((users ?? []).map((u) => [u.id, u.full_name ?? "بلا اسم"]));

  function targetLabel(r: ReportRow): string {
    if (r.target_type === "listing") return listingTitle.get(r.target_id) ?? "إعلان محذوف";
    if (r.target_type === "franchise") return franchiseName.get(r.target_id) ?? "امتياز محذوف";
    return userName.get(r.target_id) ?? "مستخدم محذوف";
  }

  function targetHref(r: ReportRow): string | null {
    if (r.target_type === "listing") return `/admin/all-listings/${r.target_id}/edit`;
    if (r.target_type === "franchise") return `/admin/all-franchises/${r.target_id}/edit`;
    return `/admin/users/${r.target_id}`;
  }

  const tabs: { value: string; label: string }[] = [
    { value: "open", label: "مفتوحة" },
    { value: "reviewed", label: "تمت المراجعة" },
    { value: "dismissed", label: "مرفوضة" },
    { value: "all", label: "الكل" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">
        لوحة الإدارة
      </div>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-admin-text">
        البلاغات
        {reports.length > 0 ? (
          <span className="ms-2 text-base font-normal text-admin-text-muted">
            ({reports.length})
          </span>
        ) : null}
      </h1>

      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/reports?status=${tab.value}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              (filter ?? "all") === tab.value
                ? "bg-admin-primary text-admin-on-primary"
                : "bg-admin-surface text-admin-text-muted hover:text-admin-text"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error ? (
        <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
          تعذّر تحميل البلاغات الآن.
        </Card>
      ) : reports.length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          لا توجد بلاغات {filter ? `بحالة "${STATUS_LABEL[filter as ReportRow["status"]] ?? filter}"` : ""} حاليًا.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => {
            const href = targetHref(r);
            return (
              <Card key={r.id} className="border-admin-border bg-admin-surface p-4 sm:p-6">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="muted">{TARGET_TYPE_LABEL[r.target_type]}</Badge>
                      {href ? (
                        <Link href={href} className="font-bold text-admin-text hover:text-admin-primary">
                          {targetLabel(r)}
                        </Link>
                      ) : (
                        <span className="font-bold text-admin-text">{targetLabel(r)}</span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-admin-text-muted">
                      بلّغ عنه {r.reporter?.full_name || "مستخدم"} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant={r.status === "open" ? "amber" : r.status === "reviewed" ? "verify" : "muted"}
                  >
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>

                <p className="mb-4 whitespace-pre-wrap text-[13px] leading-6 text-admin-text/80">
                  {r.reason}
                </p>

                {r.status === "open" ? (
                  <div className="flex gap-2">
                    <form action={markReportReviewed}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" variant="brand" size="sm">
                        تمت المراجعة
                      </Button>
                    </form>
                    <form action={dismissReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        رفض البلاغ
                      </Button>
                    </form>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
