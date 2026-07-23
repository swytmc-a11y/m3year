import Link from "next/link";
import { VerifiedBadge } from "@/components/listings/verified-badge";
import {
  SECTOR_LABELS,
  formatSar,
  formatPercentage,
  formatDate,
  type Listing,
} from "@/lib/listings/constants";

export function ListingCard({ listing }: { listing: Listing }) {
  const isVerified = listing.verification_status === "verified";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block rounded-xl border border-grid bg-white p-6 transition-colors hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-ink">{listing.title}</h3>
          <p className="mt-1 text-[13px] text-ink/50">
            قطاع {SECTOR_LABELS[listing.sector]} · {listing.city}
          </p>
        </div>
        {isVerified ? <VerifiedBadge /> : null}
      </div>

      <div className="my-4 flex flex-wrap gap-8 border-y border-dashed border-grid py-4">
        <div>
          <div className="mb-1 text-xs text-ink/50">الإيراد الشهري</div>
          <div className="font-mono text-lg font-semibold text-ink">
            {formatSar(listing.monthly_revenue)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs text-ink/50">النسبة المطروحة</div>
          <div className="font-mono text-lg font-semibold text-amber">
            {formatPercentage(listing.offered_percentage)}
          </div>
        </div>
        {listing.asking_price != null ? (
          <div>
            <div className="mb-1 text-xs text-ink/50">
              السعر المطلوب{listing.price_negotiable ? " (قابل للتفاوض)" : ""}
            </div>
            <div className="font-mono text-lg font-semibold text-ink">
              {formatSar(listing.asking_price)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-ink/50">
          {isVerified && listing.verified_at
            ? `تحقق محاسبي: ${formatDate(listing.verified_at)}`
            : "بانتظار التوثيق المالي"}
        </span>
        <span className="text-[13.5px] font-bold text-ink">عرض التفاصيل ←</span>
      </div>
    </Link>
  );
}
