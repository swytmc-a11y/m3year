import type { Database } from "@/lib/database.types";

export type Franchise = Database["public"]["Tables"]["franchises"]["Row"];
export type FranchiseConfidential =
  Database["public"]["Tables"]["franchise_confidential"]["Row"];

export type FranchiseType = "single_unit" | "area_development";

export const FRANCHISE_TYPE_LABELS: Record<FranchiseType, string> = {
  single_unit: "امتياز فرع واحد",
  area_development: "امتياز تنمية منطقة",
};

export const FRANCHISE_TYPE_OPTIONS = (
  Object.keys(FRANCHISE_TYPE_LABELS) as FranchiseType[]
).map((value) => ({ value, label: FRANCHISE_TYPE_LABELS[value] }));

export function formatSarRange(
  min: number | null,
  max: number | null,
  formatSar: (value: number) => string,
): string {
  if (min != null && max != null) {
    return min === max ? formatSar(min) : `${formatSar(min)} – ${formatSar(max)}`;
  }
  if (min != null) return `من ${formatSar(min)}`;
  if (max != null) return `حتى ${formatSar(max)}`;
  return "غير محدد";
}
