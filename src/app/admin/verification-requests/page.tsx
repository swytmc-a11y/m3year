import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { RequestStatusBadge } from "@/components/verification/request-status-badge";
import { AssignAccountantForm } from "@/components/verification/assign-accountant-form";
import { formatSar, formatDate } from "@/lib/listings/constants";

type RequestRow = {
  id: string;
  status: string;
  verified_revenue: number | null;
  notes: string | null;
  financial_statement_path: string | null;
  created_at: string;
  completed_at: string | null;
  listing: {
    id: string;
    title: string;
    monthly_revenue: number;
  } | null;
  accountant: {
    id: string;
    profile: { full_name: string | null } | null;
  } | null;
};

export default async function AdminVerificationRequestsPage() {
  const supabase = await createClient();

  const [{ data, error }, { data: activeAccountants }] = await Promise.all([
    supabase
      .from("verification_requests")
      .select(
        "id, status, verified_revenue, notes, financial_statement_path, created_at, completed_at, listing:listings(id, title, monthly_revenue), accountant:accountants(id, profile:profiles(full_name))",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("accountants")
      .select("id, profile:profiles(full_name)")
      .eq("is_active", true),
  ]);

  const requests = data as unknown as RequestRow[] | null;
  const accountantOptions = (activeAccountants ?? []).map((a) => ({
    id: a.id,
    full_name: (a as unknown as { profile: { full_name: string | null } | null })
      .profile?.full_name ?? null,
  }));

  // Pre-sign the private financial-statement objects (verification-docs is a
  // private bucket; admins may read via the storage RLS is_admin() branch).
  const statementUrls = new Map<string, string>();
  await Promise.all(
    (requests ?? [])
      .filter((r) => r.financial_statement_path)
      .map(async (r) => {
        const { data: signed } = await supabase.storage
          .from("verification-docs")
          .createSignedUrl(r.financial_statement_path!, 60 * 60);
        if (signed?.signedUrl) statementUrls.set(r.id, signed.signedUrl);
      }),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-verify">
        لوحة الإدارة
      </div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-ink">
        طلبات التوثيق المالي
        {requests && requests.length > 0 ? (
          <span className="ms-2 text-base font-normal text-ink/40">
            ({requests.length})
          </span>
        ) : null}
      </h1>

      {error ? (
        <Card className="text-center text-sm text-amber">
          تعذّر تحميل طلبات التوثيق الآن.
        </Card>
      ) : !requests || requests.length === 0 ? (
        <Card className="text-center text-ink/60">
          لا توجد طلبات توثيق بعد.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((r) => (
            <Card key={r.id} className="p-4 sm:p-6">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/listings/${r.listing?.id}`}
                    className="font-bold text-ink hover:underline"
                  >
                    {r.listing?.title ?? "إعلان محذوف"}
                  </Link>
                  <p className="mt-1 text-[13px] text-ink/50">
                    الإيراد المُعلن: {r.listing ? formatSar(r.listing.monthly_revenue) : "—"}{" "}
                    · طُلب في {formatDate(r.created_at)}
                  </p>
                </div>
                <RequestStatusBadge status={r.status as never} />
              </div>

              {r.accountant ? (
                <p className="mb-3 text-[13px] text-ink/70">
                  المحاسب المُسند:{" "}
                  <span className="font-bold">
                    {r.accountant.profile?.full_name || "بدون اسم"}
                  </span>
                </p>
              ) : null}

              <p className="mb-3 text-[13px]">
                القوائم المالية:{" "}
                {statementUrls.has(r.id) ? (
                  <a
                    href={statementUrls.get(r.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-verify hover:underline"
                  >
                    تنزيل الملف المرفوع ←
                  </a>
                ) : (
                  <span className="text-ink/40">لم تُرفع بعد</span>
                )}
              </p>

              {r.status === "completed" && r.verified_revenue != null ? (
                <p className="mb-3 text-[13px] text-verify">
                  الإيراد الموثّق: {formatSar(r.verified_revenue)} · اكتمل في{" "}
                  {r.completed_at ? formatDate(r.completed_at) : "—"}
                </p>
              ) : null}

              {r.status === "rejected" && r.notes ? (
                <p className="mb-3 text-[13px] text-red-700">
                  سبب الرفض: {r.notes}
                </p>
              ) : null}

              {r.status === "requested" ? (
                <AssignAccountantForm
                  requestId={r.id}
                  accountants={accountantOptions}
                />
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
