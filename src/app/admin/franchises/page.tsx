import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { approveFranchise } from "@/app/actions/franchises";
import { RejectFranchiseForm } from "@/components/franchises/reject-franchise-form";
import { FranchiseConfidentialPanel } from "@/components/franchises/franchise-confidential-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SECTOR_LABELS } from "@/lib/listings/constants";
import {
  formatSar,
  formatSarRange,
  formatDate,
  type Franchise,
  type FranchiseConfidential,
} from "@/lib/franchises/constants";

export default async function AdminFranchisesPage() {
  const supabase = await createClient();

  const { data: franchises, error } = await supabase
    .from("franchises")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  const franchiseIds = (franchises ?? []).map((f) => f.id);
  const { data: confidentialRows } = franchiseIds.length
    ? await supabase
        .from("franchise_confidential")
        .select("*")
        .in("franchise_id", franchiseIds)
    : { data: [] as FranchiseConfidential[] };

  const confidentialByFranchise = new Map(
    (confidentialRows ?? []).map((c) => [c.franchise_id, c]),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-verify">
        لوحة الإدارة
      </div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-ink">
        امتيازات بانتظار المراجعة
        {franchises && franchises.length > 0 ? (
          <span className="ms-2 text-base font-normal text-ink/40">
            ({franchises.length})
          </span>
        ) : null}
      </h1>

      {error ? (
        <Card className="text-center text-sm text-amber">
          تعذّر تحميل قائمة المراجعة الآن. حدّث الصفحة أو حاول لاحقًا.
        </Card>
      ) : !franchises || franchises.length === 0 ? (
        <Card className="text-center text-ink/60">
          لا توجد امتيازات بانتظار المراجعة حاليًا.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {franchises.map((franchise) => (
            <ReviewRow
              key={franchise.id}
              franchise={franchise}
              confidential={confidentialByFranchise.get(franchise.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  franchise,
  confidential,
}: {
  franchise: Franchise;
  confidential: FranchiseConfidential | null;
}) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-ink">{franchise.brand_name}</h2>
          <p className="mt-1 text-[13px] text-ink/50">
            قطاع {SECTOR_LABELS[franchise.sector]} · {franchise.city} · قُدّم في{" "}
            {formatDate(franchise.created_at)}
          </p>
        </div>
        <Link
          href={`/franchises/${franchise.id}`}
          className="shrink-0 text-[13px] font-bold text-ink hover:underline"
        >
          معاينة ←
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 border-y border-dashed border-grid py-3 sm:gap-8">
        <div>
          <div className="text-xs text-ink/50">رسوم الامتياز</div>
          <div className="font-mono font-semibold text-ink">
            {formatSar(franchise.franchise_fee)}
          </div>
        </div>
        <div>
          <div className="text-xs text-ink/50">الاستثمار المبدئي</div>
          <div className="font-mono font-semibold text-amber">
            {formatSarRange(franchise.initial_investment_min, franchise.initial_investment_max)}
          </div>
        </div>
      </div>

      {franchise.description ? (
        <p className="mb-5 whitespace-pre-line text-[13px] leading-7 text-ink/70">
          {franchise.description}
        </p>
      ) : null}

      <div className="mb-5">
        <FranchiseConfidentialPanel confidential={confidential} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <form action={approveFranchise}>
          <input type="hidden" name="id" value={franchise.id} />
          <Button type="submit" variant="verify" size="sm">
            الموافقة والنشر
          </Button>
        </form>
        <div className="sm:w-72">
          <RejectFranchiseForm franchiseId={franchise.id} />
        </div>
      </div>
    </Card>
  );
}
