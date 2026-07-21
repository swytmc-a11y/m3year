import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccountantContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { startReview } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestStatusBadge } from "@/components/verification/request-status-badge";
import { CompleteVerificationForm } from "@/components/verification/complete-verification-form";
import { RejectVerificationForm } from "@/components/verification/reject-verification-form";
import { formatSar, formatDate } from "@/lib/listings/constants";

type RequestRow = {
  id: string;
  status: string;
  notes: string | null;
  report_path: string | null;
  verified_revenue: number | null;
  completed_at: string | null;
  created_at: string;
  listing: {
    id: string;
    title: string;
    city: string;
    monthly_revenue: number;
    description: string | null;
  } | null;
};

export default async function AccountantRequestsPage() {
  const { accountant } = await requireAccountantContext();

  if (!accountant) {
    redirect("/accountant/apply");
  }

  if (!accountant.is_active) {
    return (
      <div className="mx-auto w-full max-w-md px-6 py-16 text-center">
        <Card>
          <Badge variant="amber">بانتظار التفعيل</Badge>
          <p className="mt-4 text-sm text-ink/70">
            طلبك قيد المراجعة من فريق معيار. سنُفعّل حسابك قريبًا لتتمكن من
            استلام طلبات التوثيق.
          </p>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verification_requests")
    .select(
      "id, status, notes, report_path, verified_revenue, completed_at, created_at, listing:listings(id, title, city, monthly_revenue, description)",
    )
    .eq("accountant_id", accountant.id)
    .order("created_at", { ascending: false });

  const requests = data as unknown as RequestRow[] | null;

  // Signed URLs for any completed request's uploaded report (private bucket).
  const reportUrls = new Map<string, string>();
  if (requests) {
    await Promise.all(
      requests
        .filter((r) => r.report_path)
        .map(async (r) => {
          const { data: signed } = await supabase.storage
            .from("verification-reports")
            .createSignedUrl(r.report_path!, 3600);
          if (signed?.signedUrl) reportUrls.set(r.id, signed.signedUrl);
        }),
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-ink">
        طلباتي للتوثيق
      </h1>

      {error ? (
        <Card className="text-center text-sm text-amber">
          تعذّر تحميل الطلبات الآن.
        </Card>
      ) : !requests || requests.length === 0 ? (
        <Card className="text-center text-ink/60">
          لا توجد طلبات مُسندة إليك حاليًا.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((r) => (
            <Card key={r.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/listings/${r.listing?.id}`}
                    className="font-bold text-ink hover:underline"
                  >
                    {r.listing?.title ?? "إعلان محذوف"}
                  </Link>
                  <p className="mt-1 text-[13px] text-ink/50">
                    {r.listing?.city} · الإيراد المُعلن:{" "}
                    {r.listing ? formatSar(r.listing.monthly_revenue) : "—"} ·
                    طُلب في {formatDate(r.created_at)}
                  </p>
                </div>
                <RequestStatusBadge status={r.status as never} />
              </div>

              {r.listing?.description ? (
                <p className="mb-4 whitespace-pre-line text-[13px] leading-6 text-ink/70">
                  {r.listing.description}
                </p>
              ) : null}

              {r.status === "assigned" ? (
                <div className="flex flex-wrap items-start gap-3">
                  <form action={startReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" size="sm">
                      بدء المراجعة
                    </Button>
                  </form>
                  <div className="sm:w-72">
                    <RejectVerificationForm requestId={r.id} />
                  </div>
                </div>
              ) : null}

              {r.status === "in_review" ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="sm:w-72">
                    <CompleteVerificationForm requestId={r.id} />
                  </div>
                  <div className="sm:w-72">
                    <RejectVerificationForm requestId={r.id} />
                  </div>
                </div>
              ) : null}

              {r.status === "completed" ? (
                <div className="text-[13px] text-verify">
                  <p>
                    الإيراد الموثّق:{" "}
                    <span className="font-bold">
                      {r.verified_revenue != null ? formatSar(r.verified_revenue) : "—"}
                    </span>{" "}
                    · اكتمل في {r.completed_at ? formatDate(r.completed_at) : "—"}
                  </p>
                  {reportUrls.get(r.id) ? (
                    <a
                      href={reportUrls.get(r.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block font-bold text-ink hover:underline"
                    >
                      عرض التقرير المرفوع ←
                    </a>
                  ) : null}
                </div>
              ) : null}

              {r.status === "rejected" && r.notes ? (
                <p className="text-[13px] text-red-700">سبب الرفض: {r.notes}</p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
