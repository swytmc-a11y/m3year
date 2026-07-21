import type { Database } from "@/lib/database.types";

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

// Manual grouping/formatting — avoids relying on Intl locale data, which is
// inconsistent across the Hermes engine on native devices.
function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatSar(value: number): string {
  return `${groupThousands(value)} ر.س`;
}

export function formatPercentage(value: number): string {
  const isInt = Number.isInteger(value);
  const text = isInt ? String(value) : String(Number(value.toFixed(2)));
  return `${text}٪`;
}

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
