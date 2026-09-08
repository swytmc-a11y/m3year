import { createClient } from "@/lib/supabase/server";
import { toggleUserBlocked } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/cars/constants";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, city, role, is_blocked, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const { data: profiles, error } = await query;

  // Booking counts give a customer row some weight beyond a name.
  const { data: bookingRows } = await supabase.from("bookings").select("customer_id");
  const bookingCounts = (bookingRows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.customer_id] = (acc[row.customer_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-admin-text">العملاء</h1>

      <form className="mb-8" action="/admin/users">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="ابحث بالاسم أو البريد أو الجوال"
          className="h-11 w-full rounded-lg border border-admin-border bg-admin-surface px-4 text-sm text-admin-text placeholder:text-admin-text-muted"
        />
      </form>

      {error ? (
        <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
          تعذّر تحميل الحسابات الآن.
        </Card>
      ) : !profiles || profiles.length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          {term ? "لا نتائج مطابقة." : "لا توجد حسابات بعد."}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {profiles.map((p) => (
            <Card key={p.id} className="border-admin-border bg-admin-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-admin-text">{p.full_name || "بلا اسم"}</h2>
                    {p.role === "admin" ? <Badge variant="verify">إدارة</Badge> : null}
                    {p.is_blocked ? <Badge variant="danger">محظور</Badge> : null}
                  </div>
                  <p className="mt-1 text-[13px] text-admin-text-muted">
                    <bdi dir="ltr">{p.email || "—"}</bdi>
                    {p.phone ? <> · <bdi dir="ltr">{p.phone}</bdi></> : null}
                    {` · ${bookingCounts[p.id] ?? 0} حجز`}
                    {` · انضم ${formatDate(p.created_at)}`}
                  </p>
                </div>

                {p.role !== "admin" ? (
                  <form action={toggleUserBlocked} className="shrink-0">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="blocked" value={p.is_blocked ? "0" : "1"} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className={p.is_blocked ? "" : "border-admin-danger/40 text-admin-danger hover:bg-admin-danger-tint"}
                    >
                      {p.is_blocked ? "إلغاء الحظر" : "حظر"}
                    </Button>
                  </form>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
