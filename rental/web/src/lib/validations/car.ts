import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** FormData gives "" for a blank number input; that means "not set", not 0. */
const optionalNumber = (label: string, opts?: { min?: number; max?: number; int?: boolean }) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine(
      (v) => {
        if (v === null) return true;
        const n = Number(v);
        if (Number.isNaN(n)) return false;
        if (opts?.int && !Number.isInteger(n)) return false;
        if (opts?.min != null && n < opts.min) return false;
        if (opts?.max != null && n > opts.max) return false;
        return true;
      },
      { error: `${label} غير صحيح.` },
    )
    .transform((v) => (v === null ? null : Number(v)));

const requiredNumber = (label: string, opts?: { min?: number; max?: number; int?: boolean }) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} مطلوب.` })
    .refine(
      (v) => {
        const n = Number(v);
        if (Number.isNaN(n)) return false;
        if (opts?.int && !Number.isInteger(n)) return false;
        if (opts?.min != null && n < opts.min) return false;
        if (opts?.max != null && n > opts.max) return false;
        return true;
      },
      { error: `${label} غير صحيح.` },
    )
    .transform(Number);

/** Comma/newline separated free text -> array, blanks dropped. */
const stringList = z
  .string()
  .default("")
  .transform((v) =>
    v
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const carFormSchema = z
  .object({
    branch_id: z.uuid({ error: "اختر الفرع." }),
    make: z.string().trim().min(1, { error: "أدخل الماركة." }).max(50),
    model: z.string().trim().min(1, { error: "أدخل الموديل." }).max(50),
    year: requiredNumber("سنة الصنع", { min: 1990, max: 2100, int: true }),
    category: z.enum(["economy", "family", "luxury", "suv", "commercial"]),
    transmission: z.enum(["automatic", "manual"]),
    fuel: z.enum(["petrol", "diesel", "hybrid", "electric"]),
    seats: requiredNumber("عدد المقاعد", { min: 1, max: 50, int: true }),
    doors: optionalNumber("عدد الأبواب", { min: 1, max: 10, int: true }),
    color: optionalText,

    // How many physical units of this car this branch has — the fleet
    // capacity a booking draws down from. Defaults to 1 so a car added
    // without touching this field behaves exactly as every car did before
    // this field existed.
    quantity: requiredNumber("الكمية", { min: 0, max: 999, int: true }),

    daily_price: requiredNumber("السعر اليومي", { min: 1 }),
    weekly_price: optionalNumber("السعر الأسبوعي", { min: 1 }),
    monthly_price: optionalNumber("السعر الشهري", { min: 1 }),

    daily_km_limit: optionalNumber("حد الكيلومترات", { min: 0, int: true }),
    extra_km_fee: optionalNumber("رسوم الكيلومتر الإضافي", { min: 0 }),

    min_rental_days: requiredNumber("أقل مدة", { min: 1, max: 365, int: true }),
    max_rental_days: optionalNumber("أقصى مدة", { min: 1, max: 365, int: true }),

    features: stringList,
    description: optionalText,
    images: stringList,
    status: z.enum(["draft", "available", "maintenance", "hidden"]),
    confirmation_mode: z.enum(["instant", "manual"]),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  })
  // Tier prices that rise with duration would quietly punish longer rentals,
  // which is the opposite of what the tiers exist for.
  .refine((d) => d.weekly_price == null || d.weekly_price <= d.daily_price, {
    error: "السعر الأسبوعي يجب أن يكون أقل من أو يساوي اليومي.",
    path: ["weekly_price"],
  })
  .refine(
    (d) => d.monthly_price == null || d.monthly_price <= (d.weekly_price ?? d.daily_price),
    {
      error: "السعر الشهري يجب أن يكون أقل من أو يساوي الأسبوعي.",
      path: ["monthly_price"],
    },
  )
  .refine((d) => d.max_rental_days == null || d.max_rental_days >= d.min_rental_days, {
    error: "أقصى مدة يجب أن تكون أكبر من أقل مدة.",
    path: ["max_rental_days"],
  });

export type CarFormValues = z.infer<typeof carFormSchema>;

export const carPrivateSchema = z.object({
  plate_number: optionalText,
  vin: optionalText,
  registration_expiry: optionalText,
  insurance_expiry: optionalText,
  insurance_policy_no: optionalText,
  odometer_km: optionalNumber("الممشى", { min: 0, int: true }),
  notes: optionalText,
});
