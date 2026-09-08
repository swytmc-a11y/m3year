export type CarCategory = "economy" | "family" | "luxury" | "suv" | "commercial";
export type TransmissionType = "automatic" | "manual";
export type FuelType = "petrol" | "diesel" | "hybrid" | "electric";
export type CarStatus = "draft" | "available" | "maintenance" | "hidden";
export type ConfirmationMode = "instant" | "manual";
export type AddonPricing = "per_day" | "one_time";
export type BookingStatus =
  | "pending_payment"
  | "pending_confirmation"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired";
export type PaymentStatus =
  | "unpaid"
  | "paid"
  | "refunded"
  | "partially_refunded"
  | "failed";
export type RateTier = "daily" | "weekly" | "monthly";

export const CAR_CATEGORY_LABELS: Record<CarCategory, string> = {
  economy: "اقتصادية",
  family: "عائلية",
  luxury: "فاخرة",
  suv: "دفع رباعي",
  commercial: "تجارية",
};

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  automatic: "أوتوماتيك",
  manual: "عادي",
};

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: "بنزين",
  diesel: "ديزل",
  hybrid: "هايبرد",
  electric: "كهرباء",
};

export const CAR_STATUS_LABELS: Record<CarStatus, string> = {
  draft: "مسودة",
  available: "متاحة",
  maintenance: "في الصيانة",
  hidden: "مخفية",
};

export const CONFIRMATION_MODE_LABELS: Record<ConfirmationMode, string> = {
  instant: "تأكيد فوري",
  manual: "يحتاج تأكيد",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: "بانتظار الدفع",
  pending_confirmation: "بانتظار تأكيد الفرع",
  confirmed: "مؤكد",
  active: "جارٍ",
  completed: "مكتمل",
  cancelled: "ملغى",
  rejected: "مرفوض",
  expired: "منتهي",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "غير مدفوع",
  paid: "مدفوع",
  refunded: "مسترد",
  partially_refunded: "مسترد جزئيًا",
  failed: "فشل الدفع",
};

export const RATE_TIER_LABELS: Record<RateTier, string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
};

function optionsFrom<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export const CAR_CATEGORY_OPTIONS = optionsFrom(CAR_CATEGORY_LABELS);
export const TRANSMISSION_OPTIONS = optionsFrom(TRANSMISSION_LABELS);
export const FUEL_OPTIONS = optionsFrom(FUEL_LABELS);
export const CAR_STATUS_OPTIONS = optionsFrom(CAR_STATUS_LABELS);
export const CONFIRMATION_MODE_OPTIONS = optionsFrom(CONFIRMATION_MODE_LABELS);

/** Common extras, offered as suggestions when adding a car. */
export const CAR_FEATURE_SUGGESTIONS = [
  "بلوتوث",
  "كاميرا خلفية",
  "حساسات ركن",
  "مثبت سرعة",
  "فتحة سقف",
  "شاشة لمس",
  "تشغيل بدون مفتاح",
  "مقاعد جلد",
  "شاحن لاسلكي",
  "Apple CarPlay",
  "Android Auto",
  "دخول USB",
] as const;

export function formatSar(amount: number | null | undefined): string {
  if (amount == null) return "—";
  const rounded = Math.round(amount * 100) / 100;
  const text = Number.isInteger(rounded)
    ? rounded.toLocaleString("en-US")
    : rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${text} ر.س`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

export function carTitle(car: { make: string; model: string; year: number }): string {
  return `${car.make} ${car.model} ${car.year}`;
}

/**
 * Days between pickup and return. The return date is exclusive, matching
 * the database: Jan 1 -> Jan 3 is two rental days.
 */
export function rentalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

/**
 * The per-day rate a given duration earns, mirroring quote_booking() in
 * SQL. Kept in sync deliberately: the server is authoritative for money,
 * this exists so the UI can show a tier table without a round trip.
 */
export function tierForDays(
  days: number,
  car: { daily_price: number; weekly_price: number | null; monthly_price: number | null },
  thresholds: { weekly: number; monthly: number } = { weekly: 7, monthly: 30 },
): { tier: RateTier; rate: number } {
  if (days >= thresholds.monthly && car.monthly_price != null) {
    return { tier: "monthly", rate: car.monthly_price };
  }
  if (days >= thresholds.weekly && car.weekly_price != null) {
    return { tier: "weekly", rate: car.weekly_price };
  }
  return { tier: "daily", rate: car.daily_price };
}

/** Savings vs the daily rate, for the "↓14%" badge on the tier table. */
export function tierSavingPercent(dailyPrice: number, tierRate: number): number {
  if (dailyPrice <= 0 || tierRate >= dailyPrice) return 0;
  return Math.round(((dailyPrice - tierRate) / dailyPrice) * 100);
}

/** VAT contained in a VAT-inclusive total. */
export function vatFromInclusive(total: number, vatRate: number): number {
  return Math.round((total - total / (1 + vatRate)) * 100) / 100;
}
