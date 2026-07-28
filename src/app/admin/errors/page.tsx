import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/listings/constants";

/**
 * Crash reports coming out of the mobile app.
 *
 * Grouped by message so a single bug affecting many users reads as one row
 * with a count, rather than burying everything else under hundreds of copies
 * of the same stack.
 */
export default async function AdminErrorsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_errors")
    .select("id, message, stack, context, platform, app_version, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <p className="text-sm text-ink/60">تعذّر تحميل سجل الأخطاء.</p>
    );
  }

  const rows = data ?? [];
  const groups = groupByMessage(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">سجل أخطاء التطبيق</h1>
        <p className="mt-1 text-sm text-ink/60">
          {rows.length === 0
            ? "لا أخطاء مسجّلة — وهذه أفضل حالة."
            : `${groups.length} خطأ مختلف، بإجمالي ${rows.length} بلاغ خلال آخر ٣٠ يومًا.`}
        </p>
      </div>

      {groups.map((group) => (
        <Card key={group.message} className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="flex-1 font-mono text-sm text-ink" dir="ltr">
              {group.message}
            </p>
            <Badge variant={group.count > 5 ? "danger" : "neutral"}>
              {group.count} بلاغ
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/50">
            <span>آخر ظهور: {formatDate(group.lastSeen)}</span>
            {group.platforms.length > 0 ? <span>المنصات: {group.platforms.join("، ")}</span> : null}
            {group.versions.length > 0 ? <span>الإصدارات: {group.versions.join("، ")}</span> : null}
          </div>

          {group.context ? (
            <p className="font-mono text-xs text-ink/60" dir="ltr">
              {group.context}
            </p>
          ) : null}

          {group.stack ? (
            <details>
              <summary className="cursor-pointer text-xs text-verify">عرض الـ stack</summary>
              <pre
                dir="ltr"
                className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-grid bg-paper p-3 font-mono text-[11px] leading-relaxed text-ink/70"
              >
                {group.stack}
              </pre>
            </details>
          ) : null}
        </Card>
      ))}
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
