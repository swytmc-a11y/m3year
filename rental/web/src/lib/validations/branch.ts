import { z } from "zod";

/** Empty text inputs arrive as "" from FormData; treat them as absent. */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const optionalCoordinate = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine(
      (v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max),
      { error: `${label} غير صحيح.` },
    )
    .transform((v) => (v === null ? null : Number(v)));

export const branchFormSchema = z.object({
  name: z.string().trim().min(2, { error: "أدخل اسم الفرع." }).max(80),
  city: z.string().trim().min(2, { error: "أدخل المدينة." }).max(60),
  address: optionalText,
  latitude: optionalCoordinate(-90, 90, "خط العرض"),
  longitude: optionalCoordinate(-180, 180, "خط الطول"),
  phone: optionalText,
  whatsapp: optionalText,
  working_hours: optionalText,
  deposit_note: optionalText,
  default_confirmation_mode: z.enum(["instant", "manual"]),
  is_active: z.coerce.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;
