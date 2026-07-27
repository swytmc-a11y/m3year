import { ENTITY_TYPE_LABELS, type EntityType } from "@/lib/listings/constants";
import type { FranchiseConfidential } from "@/lib/franchises/constants";

export function FranchiseConfidentialPanel({
  confidential,
}: {
  confidential: FranchiseConfidential | null;
}) {
  const rows: { label: string; value: string; muted?: boolean }[] = [
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
      <div className="mb-3 text-xs font-bold text-ink/50">بيانات الكيان</div>
      <dl className="flex flex-col gap-3 sm:gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-0.5 text-[13px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <dt className="text-ink/50">{row.label}</dt>
            <dd className={row.muted ? "font-medium text-ink/40" : "font-semibold text-ink"}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
