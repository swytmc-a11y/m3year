import {
  ENTITY_TYPE_LABELS,
  REASON_FOR_SELLING_LABELS,
  FINANCIAL_DATA_SHARING_LABELS,
  type Listing,
  type ListingConfidential,
  type EntityType,
  type ReasonForSelling,
  type FinancialDataSharing,
} from "@/lib/listings/constants";

// Disclosure/trust fields the owner submits (the "green row") plus the
// confidential legal-entity details — shown to admins and to the accountant
// assigned to a listing's verification request. The CR number is confidential
// and must only ever be rendered behind one of those two gates.
export function TrustFieldsPanel({
  listing,
  confidential,
}: {
  listing: Pick<
    Listing,
    "reason_for_selling" | "has_legal_obligations" | "financial_data_sharing"
  >;
  confidential: ListingConfidential | null;
}) {
  const rows: { label: string; value: string; muted?: boolean }[] = [
    {
      label: "سبب البيع",
      value: listing.reason_for_selling
        ? REASON_FOR_SELLING_LABELS[listing.reason_for_selling as ReasonForSelling]
        : "غير محدد",
    },
    {
      label: "التزامات قانونية على المشروع",
      value: listing.has_legal_obligations ? "يوجد" : "لا يوجد",
    },
    {
      label: "مشاركة البيانات المالية",
      value: FINANCIAL_DATA_SHARING_LABELS[
        listing.financial_data_sharing as FinancialDataSharing
      ],
    },
    {
      label: "نوع الكيان",
      value: confidential
        ? ENTITY_TYPE_LABELS[confidential.entity_type as EntityType]
        : "غير مُدخل",
      muted: !confidential,
    },
    {
      label: "رقم السجل التجاري (سرّي)",
      value: confidential?.commercial_registration_number ?? "غير مُدخل",
      muted: !confidential?.commercial_registration_number,
    },
  ];

  return (
    <div className="rounded-lg border border-grid bg-paper/40 p-4">
      <div className="mb-3 text-xs font-bold text-ink/50">
        بيانات الإفصاح والكيان
      </div>
      <dl className="flex flex-col gap-3 sm:gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 text-[13px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <dt className="text-ink/50">{row.label}</dt>
            <dd
              className={
                row.muted ? "font-medium text-ink/40" : "font-semibold text-ink"
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
