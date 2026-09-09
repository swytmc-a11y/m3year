import { createClient } from "@/lib/supabase/server";
import { setReviewHidden } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/cars/constants";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  author_name: string | null;
  is_hidden: boolean;
  created_at: string;
  car: { id: string; make: string; model: string; year: number } | null;
  branch: { id: string; name: string } | null;
};

export default async function AdminReviewsPage() {
  const supabase = await createClient();

  // is_admin() in the select policy is what makes hidden rows visible here
  // and nowhere else.
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, author_name, is_hidden, created_at, car:cars(id, make, model, year), branch:branches(id, name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const reviews = (data ?? []) as unknown as ReviewRow[];
  const hiddenCount = reviews.filter((r) => r.is_hidden).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-1 font-heading text-2xl font-extrabold text-admin-text">التقييمات</h1>
      <p className="mb-6 text-sm text-admin-text-muted">
        {reviews.length} تقييمًا
        {hiddenCount > 0 ? ` · ${hiddenCount} مخفي` : ""}
      </p>

      {error ? (
        <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
          تعذّر تحميل التقييمات الآن.
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          لا توجد تقييمات بعد. تظهر هنا بعد أن يكمل العملاء حجوزاتهم.
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card
              key={r.id}
              className={`border-admin-border bg-admin-surface ${r.is_hidden ? "opacity-60" : ""}`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[15px] text-admin-amber" aria-label={`${r.rating} من 5`}>
                  {"★".repeat(r.rating)}
                  <span className="text-admin-text-muted">{"★".repeat(5 - r.rating)}</span>
                </span>
                <span className="text-[13px] font-bold text-admin-text">
                  {r.author_name ?? "عميل"}
                </span>
                {r.is_hidden ? <Badge variant="danger">مخفي</Badge> : null}
                <span className="ms-auto text-[12px] text-admin-text-muted">
                  {formatDate(r.created_at)}
                </span>
              </div>

              <p className="mb-2 text-[12.5px] text-admin-text-muted">
                {r.car ? `${r.car.make} ${r.car.model} ${r.car.year}` : "سيارة محذوفة"}
                {r.branch ? ` · ${r.branch.name}` : ""}
              </p>

              {r.comment ? (
                <p className="mb-3 text-[13px] leading-6 text-admin-text">{r.comment}</p>
              ) : (
                <p className="mb-3 text-[12.5px] italic text-admin-text-muted">بلا تعليق</p>
              )}

              <form action={setReviewHidden}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="hidden" value={r.is_hidden ? "false" : "true"} />
                <Button type="submit" size="sm" variant={r.is_hidden ? "ghost" : "danger"}>
                  {r.is_hidden ? "إظهار التقييم" : "إخفاء التقييم"}
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
