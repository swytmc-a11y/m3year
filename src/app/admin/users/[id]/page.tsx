import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { blockUser, unblockUser } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListingStatusBadge } from "@/components/listings/status-badge";
import { RequestStatusBadge } from "@/components/verification/request-status-badge";
import { SECTOR_LABELS, formatSar, formatPercentage, formatDate } from "@/lib/listings/constants";
import type { Database } from "@/lib/supabase/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

const ROLE_LABELS: Record<UserRole, string> = {
  project_owner: "صاحب مشروع",
  investor: "مستثمر",
  accountant: "محاسب",
  admin: "مدير",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const [
    { data: contact },
    { data: listings },
    { data: accountant },
    { data: assignedRequests },
    { data: reportsAgainst },
    { count: reportsBy },
    { count: conversationCount },
  ] = await Promise.all([
    supabase.from("profile_contact").select("email, phone").eq("id", id).maybeSingle(),
    supabase.from("listings").select("*").eq("owner_id", id).order("created_at", { ascending: false }),
    profile.role === "accountant"
      ? supabase.from("accountants").select("*").eq("id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.role === "accountant"
      ? supabase
          .from("verification_requests")
          .select("id, status, created_at, completed_at, listing:listings(id, title)")
          .eq("accountant_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("reports").select("id, reason, status, created_at").eq("target_type", "user").eq("target_id", id),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("reporter_id", id),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .or(`owner_id.eq.${id},investor_id.eq.${id}`),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/admin/users"
        className="mb-6 inline-block text-sm text-ink/50 hover:text-ink"
      >
        ← كل الحسابات
      </Link>

      <Card className="mb-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-extrabold text-ink">
              {profile.full_name || "بدون اسم"}
            </h1>
            <p className="mt-1 text-[13px] text-ink/50">
              {contact?.email || "—"}
              {contact?.phone ? ` · ${contact.phone}` : ""}
            </p>
            <p className="mt-1 text-[13px] text-ink/50">
              انضم في {formatDate(profile.created_at)}
              {profile.city ? ` · ${profile.city}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge variant={profile.role === "admin" ? "verify" : "neutral"}>
              {ROLE_LABELS[profile.role]}
            </Badge>
            {profile.is_blocked ? <Badge variant="danger">محظور</Badge> : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-8 border-y border-dashed border-grid py-3">
          <div>
            <div className="text-xs text-ink/50">الإعلانات</div>
            <div className="font-mono font-semibold text-ink">{listings?.length ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-ink/50">المحادثات</div>
            <div className="font-mono font-semibold text-ink">{conversationCount ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-ink/50">بلاغات ضده</div>
            <div className={reportsAgainst && reportsAgainst.length > 0 ? "font-mono font-semibold text-amber" : "font-mono font-semibold text-ink"}>
              {reportsAgainst?.length ?? 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-ink/50">بلاغات قدّمها</div>
            <div className="font-mono font-semibold text-ink">{reportsBy ?? 0}</div>
          </div>
        </div>

        {profile.role !== "admin" ? (
          <div className="mt-5">
            {profile.is_blocked ? (
              <form action={unblockUser}>
                <input type="hidden" name="id" value={profile.id} />
                <Button type="submit" variant="verify" size="sm">
                  إلغاء الحظر
                </Button>
              </form>
            ) : (
              <form action={blockUser}>
                <input type="hidden" name="id" value={profile.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  حظر الحساب
                </Button>
              </form>
            )}
          </div>
        ) : null}
      </Card>

      {reportsAgainst && reportsAgainst.length > 0 ? (
        <Card className="mb-6 p-4 sm:p-6">
          <h2 className="mb-3 font-bold text-ink">بلاغات مُقدَّمة ضد هذا الحساب</h2>
          <div className="flex flex-col gap-3">
            {reportsAgainst.map((r) => (
              <div key={r.id} className="text-[13px]">
                <span className="font-medium text-ink">{r.reason}</span>
                <span className="text-ink/40"> · {formatDate(r.created_at)} · {r.status}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {profile.role === "accountant" ? (
        <Card className="mb-6 p-4 sm:p-6">
          <h2 className="mb-3 font-bold text-ink">بيانات المحاسب</h2>
          {accountant ? (
            <p className="mb-4 text-[13px] text-ink/60">
              عضوية SOCPA: {accountant.socpa_number || "—"} ·{" "}
              {accountant.is_active ? "مفعّل" : "بانتظار التفعيل"}
            </p>
          ) : (
            <p className="mb-4 text-[13px] text-ink/40">لا يملك ملف محاسب بعد.</p>
          )}
          {assignedRequests && assignedRequests.length > 0 ? (
            <div className="flex flex-col gap-3">
              {assignedRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 text-[13px]">
                  <Link
                    href={`/listings/${(r as { listing?: { id?: string } }).listing?.id ?? ""}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {(r as { listing?: { title?: string } }).listing?.title ?? "إعلان محذوف"}
                  </Link>
                  <RequestStatusBadge status={r.status as never} />
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="p-4 sm:p-6">
        <h2 className="mb-3 font-bold text-ink">
          الإعلانات ({listings?.length ?? 0})
        </h2>
        {!listings || listings.length === 0 ? (
          <p className="text-[13px] text-ink/40">لا توجد إعلانات.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {listings.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-grid pt-3 first:border-t-0 first:pt-0">
                <div className="min-w-0">
                  <Link
                    href={`/admin/all-listings/${l.id}/edit`}
                    className="font-medium text-ink hover:underline"
                  >
                    {l.title}
                  </Link>
                  <p className="text-[13px] text-ink/50">
                    {SECTOR_LABELS[l.sector]} · {l.city} · {formatSar(l.monthly_revenue)} ·{" "}
                    {formatPercentage(l.offered_percentage)}
                  </p>
                </div>
                <ListingStatusBadge status={l.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
