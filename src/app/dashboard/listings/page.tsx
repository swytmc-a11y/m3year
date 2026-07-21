import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  submitListingForReview,
  archiveListing,
} from "@/app/actions/listings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingStatusBadge } from "@/components/listings/status-badge";
import { VerifiedBadge } from "@/components/listings/verified-badge";
import {
  SECTOR_LABELS,
  formatSar,
  formatPercentage,
  type Listing,
} from "@/lib/listings/constants";

export default async function MyListingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: listings, error } = await supabase
    .from("listings")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          إعلاناتي
        </h1>
        <Button asChild size="sm">
          <Link href="/dashboard/listings/new">إعلان جديد</Link>
        </Button>
      </div>

      {error ? (
        <Card className="text-center text-sm text-amber">
          تعذّر تحميل إعلاناتك الآن. حدّث الصفحة أو حاول لاحقًا.
        </Card>
      ) : !listings || listings.length === 0 ? (
        <Card className="text-center">
          <p className="mb-4 text-ink/60">لم تنشئ أي إعلان بعد.</p>
          <Button asChild size="sm">
            <Link href="/dashboard/listings/new">أنشئ أول إعلان</Link>
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map((listing) => (
            <MyListingRow key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyListingRow({ listing }: { listing: Listing }) {
  const canSubmit =
    listing.status === "draft" || listing.status === "rejected";
  const canArchive = listing.status !== "archived";

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink">{listing.title}</h2>
          <p className="mt-1 text-[13px] text-ink/50">
            قطاع {SECTOR_LABELS[listing.sector]} · {listing.city}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ListingStatusBadge status={listing.status} />
          {listing.verification_status === "verified" ? (
            <VerifiedBadge />
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex gap-8 border-y border-dashed border-grid py-3">
        <div>
          <div className="text-xs text-ink/50">الإيراد الشهري</div>
          <div className="font-mono font-semibold text-ink">
            {formatSar(listing.monthly_revenue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-ink/50">النسبة المطروحة</div>
          <div className="font-mono font-semibold text-amber">
            {formatPercentage(listing.offered_percentage)}
          </div>
        </div>
      </div>

      {listing.status === "rejected" && listing.rejection_reason ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
          سبب الرفض: {listing.rejection_reason}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/listings/${listing.id}/edit`}>تعديل</Link>
        </Button>

        {listing.status === "published" ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/listings/${listing.id}`}>عرض عام</Link>
          </Button>
        ) : null}

        {canSubmit ? (
          <form action={submitListingForReview}>
            <input type="hidden" name="id" value={listing.id} />
            <Button type="submit" variant="verify" size="sm">
              إرسال للمراجعة
            </Button>
          </form>
        ) : null}

        {canArchive ? (
          <form action={archiveListing}>
            <input type="hidden" name="id" value={listing.id} />
            <Button type="submit" variant="ghost" size="sm">
              أرشفة
            </Button>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
