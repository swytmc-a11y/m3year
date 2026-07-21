import type { Database } from "@/lib/supabase/database.types";

export type BusinessSector = Database["public"]["Enums"]["business_sector"];
export type ListingStatus = Database["public"]["Enums"]["listing_status"];
export type VerificationStatus =
  Database["public"]["Enums"]["verification_status"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];

export const SECTOR_LABELS: Record<BusinessSector, string> = {
  cafe: "مقاهي",
  restaurant: "مطاعم",
  retail: "تجزئة",
  services: "خدمات",
  other: "أخرى",
};

export const SECTOR_OPTIONS = (
  Object.keys(SECTOR_LABELS) as BusinessSector[]
).map((value) => ({ value, label: SECTOR_LABELS[value] }));

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "مسودة",
  pending_review: "قيد المراجعة",
  published: "منشور",
  rejected: "مرفوض",
  archived: "مؤرشف",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  none: "غير موثّق",
  pending: "قيد التوثيق",
  verified: "موثّق",
  rejected: "توثيق مرفوض",
};

// Latin digits + grouping to match the brand's IBM Plex Mono financial readout
// (e.g. "48,200 ر.س"), rather than Arabic-Indic numerals.
const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatSar(value: number): string {
  return `${numberFormatter.format(value)} ر.س`;
}

export function formatPercentage(value: number): string {
  // Trim a trailing ".00" but keep meaningful decimals (e.g. 12.5٪).
  const n = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `${numberFormatter.format(Math.trunc(n))}${
    Number.isInteger(n) ? "" : String(n).replace(/^\d+/, "")
  }٪`;
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
