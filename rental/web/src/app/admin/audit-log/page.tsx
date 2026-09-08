import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/cars/constants";

/**
 * Read-only trail of every admin action logged via the log_audit() RPC —
 * approvals, rejections, deletions, verification toggles, accountant
 * grants. Every one of those calls has fired into this table since early
 * in the project; this is the first page that reads it back.
 */
export default async function AdminAuditLogPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, actor_id, entity_type, entity_id, metadata, created_at, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as unknown as AuditRow[];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">
        لوحة الإدارة
      </div>
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-admin-text">سجل العمليات</h1>
      <p className="mb-8 text-[13px] text-admin-text-muted">
        كل إجراء إداري مؤثر — موافقة، رفض، حذف، توثيق، منح صلاحيات — بمن قام به ومتى.
      </p>

      {error ? (
        <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
          تعذّر تحميل سجل العمليات الآن.
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          لا توجد عمليات مسجّلة بعد.
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 border-admin-border bg-admin-surface px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Badge variant="muted">{row.entity_type ?? "—"}</Badge>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13px] text-admin-text" dir="ltr">
                    {row.action}
                  </p>
                  <p className="mt-0.5 text-xs text-admin-text-muted">
                    {row.actor?.full_name || "النظام"}
                    {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}…` : ""}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-admin-text-muted">{formatDate(row.created_at)}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type AuditRow = {
  id: number;
  action: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
  actor: { full_name: string | null } | null;
};
