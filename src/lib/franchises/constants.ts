import type { Database } from "@/lib/supabase/database.types";

export type Franchise = Database["public"]["Tables"]["franchises"]["Row"];
export type FranchiseConfidential =
  Database["public"]["Tables"]["franchise_confidential"]["Row"];

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatSar(value: number): string {
  return `${numberFormatter.format(value)} ر.س`;
}

export function formatSarRange(min: number | null, max: number | null): string {
  if (min != null && max != null) {
    return min === max ? formatSar(min) : `${formatSar(min)} – ${formatSar(max)}`;
  }
  if (min != null) return `من ${formatSar(min)}`;
  if (max != null) return `حتى ${formatSar(max)}`;
  return "غير محدد";
}

const dateFormatter = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatDate(value: string | null): string {
  if (!value) return "";
  return dateFormatter.format(new Date(value));
}
