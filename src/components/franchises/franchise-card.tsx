import Link from "next/link";
import { VerifiedBadge } from "@/components/listings/verified-badge";
import { SECTOR_LABELS } from "@/lib/listings/constants";
import { formatSar, formatSarRange, formatDate, type Franchise } from "@/lib/franchises/constants";

export function FranchiseCard({ franchise }: { franchise: Franchise }) {
  const isVerified = franchise.verification_status === "verified";

  return (
    <Link
      href={`/franchises/${franchise.id}`}
      className="block rounded-xl border border-grid bg-white p-6 transition-colors hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-ink">{franchise.brand_name}</h3>
          <p className="mt-1 text-[13px] text-ink/50">
            قطاع {SECTOR_LABELS[franchise.sector]} · {franchise.city}
          </p>
        </div>
        {isVerified ? <VerifiedBadge /> : null}
      </div>

      <div className="my-4 flex flex-wrap gap-8 border-y border-dashed border-grid py-4">
        <div>
          <div className="mb-1 text-xs text-ink/50">رسوم الامتياز</div>
          <div className="font-mono text-lg font-semibold text-ink">
            {formatSar(franchise.franchise_fee)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs text-ink/50">الاستثمار المبدئي</div>
          <div className="font-mono text-lg font-semibold text-amber">
            {formatSarRange(franchise.initial_investment_min, franchise.initial_investment_max)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-ink/50">
          {isVerified && franchise.verified_at
            ? `تحقق محاسبي: ${formatDate(franchise.verified_at)}`
            : "بانتظار التوثيق المالي"}
        </span>
        <span className="text-[13.5px] font-bold text-ink">عرض التفاصيل ←</span>
      </div>
    </Link>
  );
}
