import type { Database } from "@/lib/database.types";

export type Franchise = Database["public"]["Tables"]["franchises"]["Row"];
export type FranchiseConfidential =
  Database["public"]["Tables"]["franchise_confidential"]["Row"];

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
