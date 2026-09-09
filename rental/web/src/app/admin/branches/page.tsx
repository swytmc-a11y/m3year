import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleBranchActive } from "@/app/actions/branches";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONFIRMATION_MODE_LABELS } from "@/lib/cars/constants";

export default async function AdminBranchesPage() {
  const supabase = await createClient();

  const { data: branches, error } = await supabase
    .from("branches")
    .select("*")
    .order("sort_order")
    .order("name");

  // Fleet size per branch, so a branch row says something useful at a glance.
  const { data: carRows } = await supabase.from("cars").select("branch_id");
  const carCounts = (carRows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.branch_id] = (acc[row.branch_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-admin-text">
          الفروع
          {branches && branches.length > 0 ? (
            <span className="ms-2 text-base font-normal text-admin-text-muted">({branches.length})</span>
          ) : null}
        </h1>
        <Button asChild variant="brand" size="sm">
          <Link href="/admin/branches/new">إضافة فرع</Link>
        </Button>
      </div>
      <p className="mb-8 text-[13px] text-admin-text-muted">
        كل سيارة تتبع فرعًا. الإحداثيات تُستخدم لترتيب «الأقرب لي» في التطبيق.
      </p>

      {error ? (
        <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
          تعذّر تحميل الفروع الآن.
        </Card>
      ) : !branches || branches.length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          لا توجد فروع بعد. ابدأ بإضافة فرع — لا يمكن إضافة سيارة بدونه.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {branches.map((branch) => (
            <Card key={branch.id} className="border-admin-border bg-admin-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-admin-text">{branch.name}</h2>
                    {branch.is_active ? null : <Badge variant="muted">معطّل</Badge>}
                    {branch.latitude == null || branch.longitude == null ? (
                      <Badge variant="amber">بلا إحداثيات</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] text-admin-text-muted">
                    {branch.city}
                    {branch.address ? ` · ${branch.address}` : ""}
                    {` · ${carCounts[branch.id] ?? 0} سيارة`}
                    {` · ${CONFIRMATION_MODE_LABELS[branch.default_confirmation_mode]}`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/cars?branch=${branch.id}`}>سياراته</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/branches/${branch.id}/edit`}>تعديل</Link>
                  </Button>
                  <form action={toggleBranchActive}>
                    <input type="hidden" name="id" value={branch.id} />
                    <input type="hidden" name="active" value={branch.is_active ? "0" : "1"} />
                    <Button type="submit" variant="ghost" size="sm">
                      {branch.is_active ? "تعطيل" : "تفعيل"}
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
