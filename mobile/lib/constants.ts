import type { Database } from "@/lib/database.types";

export type BusinessSector = Database["public"]["Enums"]["business_sector"];
export type ListingStatus = Database["public"]["Enums"]["listing_status"];
export type VerificationStatus =
  Database["public"]["Enums"]["verification_status"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type ListingConfidential =
  Database["public"]["Tables"]["listing_confidential"]["Row"];

export type EntityType = "sole_proprietorship" | "company";
export type ReasonForSelling =
  | "expansion"
  | "development"
  | "liquidity_need"
  | "new_venture"
  | "partnership_dispute"
  | "retirement"
  | "relocation"
  | "other";
export type FinancialDataSharing = "now" | "on_request" | "none";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  sole_proprietorship: "مؤسسة فردية",
  company: "شركة",
};

export const ENTITY_TYPE_OPTIONS = (
  Object.keys(ENTITY_TYPE_LABELS) as EntityType[]
).map((value) => ({ value, label: ENTITY_TYPE_LABELS[value] }));

export const REASON_FOR_SELLING_LABELS: Record<ReasonForSelling, string> = {
  expansion: "التوسع",
  development: "تطوير المشروع",
  liquidity_need: "الحاجة إلى سيولة",
  new_venture: "التفرغ لمشروع جديد",
  partnership_dispute: "خلاف بين الشركاء",
  retirement: "التقاعد",
  relocation: "الانتقال إلى مدينة أخرى",
  other: "أخرى",
};

export const REASON_FOR_SELLING_OPTIONS = (
  Object.keys(REASON_FOR_SELLING_LABELS) as ReasonForSelling[]
).map((value) => ({ value, label: REASON_FOR_SELLING_LABELS[value] }));

export const FINANCIAL_DATA_SHARING_LABELS: Record<
  FinancialDataSharing,
  string
> = {
  now: "متاحة الآن للمستثمرين الجادين",
  on_request: "تُشارك عند الطلب بعد التواصل",
  none: "غير متاحة حاليًا",
};

export const FINANCIAL_DATA_SHARING_OPTIONS = (
  Object.keys(FINANCIAL_DATA_SHARING_LABELS) as FinancialDataSharing[]
).map((value) => ({ value, label: FINANCIAL_DATA_SHARING_LABELS[value] }));

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
  pending: "طلب التوثيق قيد المعالجة",
  verified: "موثّق",
  rejected: "توثيق مرفوض",
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
