import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/listings/constants";

/**
 * Two feeds share one table: automatic crash reports (fired by
 * mobile/lib/error-reporting.ts's reportError on an uncaught error) and
 * problems users describe themselves from Settings → "الإبلاغ عن مشكلة"
 * (context: "user_report"). They're split into separate sections because
 * they need different treatment — a user report is one specific person
 * describing one specific thing, worth reading individually, while crash
 * reports are worth grouping so one bug affecting many users reads as one
 * row with a count instead of burying everything else.
 */
export default async function AdminErrorsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_errors")
    .select("id, message, stack, context, platform, app_version, created_at, user_id, reporter:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return <p className="text-sm text-admin-text-muted">تعذّر تحميل سجل الأخطاء.</p>;
  }

  const rows = (data ?? []) as unknown as ErrorRow[];
  const userReports = rows.filter((r) => r.context === "user_report");
  const crashes = rows.filter((r) => r.context !== "user_report");
  const groups = groupByMessage(crashes);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-admin-text">سجل أخطاء التطبيق</h1>
        <p className="mt-1 text-sm text-admin-text-muted">
          {rows.length === 0
            ? "لا أخطاء أو بلاغات مسجّلة — وهذه أفضل حالة."
            : `${userReports.length} بلاغ من مستخدمين، ${groups.length} خطأ تلقائي مختلف (${crashes.length} إجمالًا) خلال آخر ٣٠ يومًا.`}
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-heading text-base font-extrabold text-admin-text">
          بلاغات من المستخدمين
          {userReports.length > 0 ? (
            <span className="ms-2 text-sm font-normal text-admin-text-muted">({userReports.length})</span>
          ) : null}
        </h2>
        {userReports.length === 0 ? (
          <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-text-muted">
            لا توجد بلاغات من مستخدمين حاليًا.
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {userReports.map((r) => (
              <Card key={r.id} className="border-admin-border bg-admin-surface space-y-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="flex-1 text-[13px] leading-6 text-admin-text">{r.message}</p>
                  <Badge variant="neutral">{formatDate(r.created_at)}</Badge>
                </div>
                <p className="text-xs text-admin-text-muted">
                  {r.reporter?.full_name || "مستخدم بلا اسم"}
                  {r.platform ? ` · ${r.platform}` : ""}
                  {r.app_version ? ` · v${r.app_version}` : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-heading text-base font-extrabold text-admin-text">
          أخطاء تلقائية
          {groups.length > 0 ? (
            <span className="ms-2 text-sm font-normal text-admin-text-muted">({groups.length})</span>
          ) : null}
        </h2>
        {groups.length === 0 ? (
          <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-text-muted">
            لا أخطاء تلقائية مسجّلة.
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <Card key={group.message} className="border-admin-border bg-admin-surface space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="flex-1 font-mono text-sm text-admin-text" dir="ltr">
                    {group.message}
                  </p>
                  <Badge variant={group.count > 5 ? "danger" : "neutral"}>{group.count} بلاغ</Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-admin-text-muted">
                  <span>آخر ظهور: {formatDate(group.lastSeen)}</span>
                  {group.platforms.length > 0 ? <span>المنصات: {group.platforms.join("، ")}</span> : null}
                  {group.versions.length > 0 ? <span>الإصدارات: {group.versions.join("، ")}</span> : null}
                </div>

                {group.context ? (
                  <p className="font-mono text-xs text-admin-text-muted" dir="ltr">
                    {group.context}
                  </p>
                ) : null}

                {group.stack ? (
                  <details>
                    <summary className="cursor-pointer text-xs text-admin-primary">عرض الـ stack</summary>
                    <pre
                      dir="ltr"
                      className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-admin-border bg-admin-bg p-3 font-mono text-[11px] leading-relaxed text-admin-text/70"
                    >
                      {group.stack}
                    </pre>
                  </details>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type ErrorRow = {
  id: string;
  message: string;
  stack: string | null;
  context: string | null;
  platform: string | null;
  app_version: string | null;
  created_at: string;
  user_id: string | null;
  reporter: { full_name: string | null } | null;
};

function groupByMessage(rows: ErrorRow[]) {
  const map = new Map<
    string,
    {
      message: string;
      count: number;
      lastSeen: string;
      stack: string | null;
      context: string | null;
      platforms: string[];
      versions: string[];
    }
  >();

  for (const row of rows) {
    const existing = map.get(row.message);
    if (!existing) {
      map.set(row.message, {
        message: row.message,
        count: 1,
        // Rows arrive newest-first, so the first one seen is the latest.
        lastSeen: row.created_at,
        stack: row.stack,
        context: row.context,
        platforms: row.platform ? [row.platform] : [],
        versions: row.app_version ? [row.app_version] : [],
      });
      continue;
    }
    existing.count += 1;
    if (row.platform && !existing.platforms.includes(row.platform)) {
      existing.platforms.push(row.platform);
    }
    if (row.app_version && !existing.versions.includes(row.app_version)) {
      existing.versions.push(row.app_version);
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}
