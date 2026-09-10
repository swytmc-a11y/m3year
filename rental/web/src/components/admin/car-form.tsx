"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/admin/image-uploader";
import {
  CAR_CATEGORY_OPTIONS,
  TRANSMISSION_OPTIONS,
  FUEL_OPTIONS,
  CAR_STATUS_OPTIONS,
  CONFIRMATION_MODE_OPTIONS,
  CAR_FEATURE_SUGGESTIONS,
  formatSar,
  tierSavingPercent,
} from "@/lib/cars/constants";
import type { ActionState } from "@/lib/action-state";
import type { Tables } from "@/lib/supabase/database.types";

type Car = Tables<"cars">;
type CarPrivate = Tables<"car_private">;
type Addon = Tables<"addons">;
type CarAddon = Tables<"car_addons">;
type Branch = Pick<Tables<"branches">, "id" | "name" | "city">;

const initial: ActionState = {};

export function CarForm({
  car,
  carPrivate,
  branches,
  addons,
  carAddons,
  action,
}: {
  car?: Car;
  carPrivate?: CarPrivate | null;
  branches: Branch[];
  addons: Addon[];
  carAddons: CarAddon[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const errors = state.fieldErrors ?? {};

  // Mirrored locally so the tier table can preview savings as they type,
  // before anything is saved.
  const [daily, setDaily] = useState(car?.daily_price?.toString() ?? "");
  const [weekly, setWeekly] = useState(car?.weekly_price?.toString() ?? "");
  const [monthly, setMonthly] = useState(car?.monthly_price?.toString() ?? "");

  const dailyNum = Number(daily) || 0;
  const weeklyNum = Number(weekly) || 0;
  const monthlyNum = Number(monthly) || 0;

  const addonPriceFor = (addonId: string) =>
    carAddons.find((ca) => ca.addon_id === addonId)?.price?.toString() ?? "";
  const addonEnabledFor = (addonId: string) => {
    const row = carAddons.find((ca) => ca.addon_id === addonId);
    return row ? row.is_available : true;
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* ------------------------------------------------ identity ------ */}
      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">السيارة</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="branch_id">الفرع</Label>
          <Select id="branch_id" name="branch_id" defaultValue={car?.branch_id ?? ""} required>
            <option value="" disabled>
              اختر الفرع
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.city}
              </option>
            ))}
          </Select>
          {errors.branch_id ? (
            <p className="text-[12px] text-admin-danger">{errors.branch_id[0]}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="الماركة" name="make" defaultValue={car?.make} required error={errors.make?.[0]} />
          <Field label="الموديل" name="model" defaultValue={car?.model} required error={errors.model?.[0]} />
          <Field
            label="سنة الصنع"
            name="year"
            type="number"
            dir="ltr"
            defaultValue={car?.year?.toString()}
            required
            error={errors.year?.[0]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="الفئة" name="category" defaultValue={car?.category} options={CAR_CATEGORY_OPTIONS} />
          <SelectField label="ناقل الحركة" name="transmission" defaultValue={car?.transmission} options={TRANSMISSION_OPTIONS} />
          <SelectField label="نوع الوقود" name="fuel" defaultValue={car?.fuel} options={FUEL_OPTIONS} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="عدد المقاعد" name="seats" type="number" dir="ltr" defaultValue={car?.seats?.toString() ?? "5"} required error={errors.seats?.[0]} />
          <Field label="عدد الأبواب" name="doors" type="number" dir="ltr" defaultValue={car?.doors?.toString() ?? ""} error={errors.doors?.[0]} />
          <Field label="اللون" name="color" defaultValue={car?.color ?? ""} error={errors.color?.[0]} />
        </div>

        <Field
          label="الكمية في هذا الفرع"
          name="quantity"
          type="number"
          dir="ltr"
          defaultValue={(car?.quantity ?? 1).toString()}
          required
          hint="عدد السيارات الفعلية من هذا الموديل في هذا الفرع — تُحجز الأخيرة منها فقط عندما لا تبقى وحدة متاحة للتواريخ المطلوبة."
          error={errors.quantity?.[0]}
        />
      </Card>

      {/* ------------------------------------------------- pricing ------ */}
      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-heading text-base font-extrabold text-admin-text">التسعير</h2>
          <p className="mt-1 text-[12px] text-admin-text-muted">
            الأسعار <strong>شاملة ضريبة القيمة المضافة</strong>، وكل سعر هو سعر اليوم الواحد
            ضمن شريحته. الشريحة تُطبَّق على كامل المدة.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="اليومي (أقل من ٧ أيام)"
            name="daily_price"
            type="number"
            step="0.01"
            dir="ltr"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            required
            error={errors.daily_price?.[0]}
          />
          <Field
            label="الأسبوعي (٧–٢٩ يومًا)"
            name="weekly_price"
            type="number"
            step="0.01"
            dir="ltr"
            value={weekly}
            onChange={(e) => setWeekly(e.target.value)}
            error={errors.weekly_price?.[0]}
          />
          <Field
            label="الشهري (٣٠+ يومًا)"
            name="monthly_price"
            type="number"
            step="0.01"
            dir="ltr"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            error={errors.monthly_price?.[0]}
          />
        </div>

        {dailyNum > 0 ? (
          <div className="rounded-lg border border-admin-border bg-admin-bg p-4">
            <p className="mb-3 text-[12px] font-bold text-admin-text-muted">
              كما ستظهر للعميل في صفحة السيارة
            </p>
            <div className="flex flex-col gap-2">
              <TierRow label="٣ أيام" rate={dailyNum} daily={dailyNum} />
              {weeklyNum > 0 ? <TierRow label="أسبوع" rate={weeklyNum} daily={dailyNum} /> : null}
              {monthlyNum > 0 ? <TierRow label="شهر" rate={monthlyNum} daily={dailyNum} /> : null}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="حد الكيلومترات اليومي"
            name="daily_km_limit"
            type="number"
            dir="ltr"
            defaultValue={car?.daily_km_limit?.toString() ?? ""}
            hint="اتركه فارغًا إن لم يوجد حد"
            error={errors.daily_km_limit?.[0]}
          />
          <Field
            label="رسوم الكيلومتر الإضافي"
            name="extra_km_fee"
            type="number"
            step="0.01"
            dir="ltr"
            defaultValue={car?.extra_km_fee?.toString() ?? ""}
            error={errors.extra_km_fee?.[0]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="أقل مدة إيجار (أيام)" name="min_rental_days" type="number" dir="ltr" defaultValue={(car?.min_rental_days ?? 1).toString()} error={errors.min_rental_days?.[0]} />
          <Field label="أقصى مدة إيجار (أيام)" name="max_rental_days" type="number" dir="ltr" defaultValue={car?.max_rental_days?.toString() ?? ""} error={errors.max_rental_days?.[0]} />
        </div>
      </Card>

      {/* -------------------------------------------------- addons ------ */}
      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-heading text-base font-extrabold text-admin-text">الخدمات الإضافية</h2>
          <p className="mt-1 text-[12px] text-admin-text-muted">
            السعر لكل سيارة على حدة. اترك السعر فارغًا لعدم عرض الخدمة لهذه السيارة.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-admin-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-admin-text">{addon.name}</p>
                <p className="text-[12px] text-admin-text-muted">
                  {addon.pricing_type === "per_day" ? "يُحتسب لكل يوم" : "مرة واحدة"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[12px] text-admin-text-muted">
                  <input
                    type="checkbox"
                    name={`addon_on_${addon.id}`}
                    defaultChecked={addonEnabledFor(addon.id)}
                    className="size-4 accent-admin-primary"
                  />
                  متاحة
                </label>
                <Input
                  name={`addon_price_${addon.id}`}
                  type="number"
                  step="0.01"
                  dir="ltr"
                  placeholder="السعر"
                  defaultValue={addonPriceFor(addon.id)}
                  className="w-28"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* --------------------------------------------------- media ------ */}
      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">الصور والمواصفات</h2>

        <div className="flex flex-col gap-2">
          <Label>صور السيارة</Label>
          <ImageUploader name="images" defaultValue={car?.images ?? []} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="features">المزايا</Label>
          <Textarea
            id="features"
            name="features"
            rows={3}
            defaultValue={(car?.features ?? []).join("، ")}
            placeholder={CAR_FEATURE_SUGGESTIONS.slice(0, 5).join("، ")}
          />
          <p className="text-[12px] text-admin-text-muted">افصل بينها بفاصلة أو سطر جديد.</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">الوصف</Label>
          <Textarea id="description" name="description" rows={4} defaultValue={car?.description ?? ""} />
        </div>
      </Card>

      {/* ------------------------------------------------- internal ----- */}
      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-heading text-base font-extrabold text-admin-text">بيانات داخلية</h2>
          <p className="mt-1 text-[12px] text-admin-text-muted">
            لا تظهر للعملاء إطلاقًا — محفوظة في جدول منفصل لا يصله سوى الإدارة.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم اللوحة" name="plate_number" defaultValue={carPrivate?.plate_number ?? ""} />
          <Field label="رقم الهيكل (VIN)" name="vin" dir="ltr" defaultValue={carPrivate?.vin ?? ""} />
          <Field label="انتهاء الاستمارة" name="registration_expiry" type="date" dir="ltr" defaultValue={carPrivate?.registration_expiry ?? ""} />
          <Field label="انتهاء التأمين" name="insurance_expiry" type="date" dir="ltr" defaultValue={carPrivate?.insurance_expiry ?? ""} />
          <Field label="رقم وثيقة التأمين" name="insurance_policy_no" dir="ltr" defaultValue={carPrivate?.insurance_policy_no ?? ""} />
          <Field label="الممشى (كم)" name="odometer_km" type="number" dir="ltr" defaultValue={carPrivate?.odometer_km?.toString() ?? ""} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">ملاحظات داخلية</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={carPrivate?.notes ?? ""} />
        </div>
      </Card>

      {/* --------------------------------------------- publication ------ */}
      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">النشر</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="الحالة" name="status" defaultValue={car?.status ?? "draft"} options={CAR_STATUS_OPTIONS} />
          <SelectField
            label="تأكيد الحجز"
            name="confirmation_mode"
            defaultValue={car?.confirmation_mode ?? "manual"}
            options={CONFIRMATION_MODE_OPTIONS}
          />
          <Field label="ترتيب العرض" name="sort_order" type="number" dir="ltr" defaultValue={(car?.sort_order ?? 0).toString()} />
        </div>
        <p className="text-[12px] text-admin-text-muted">
          «تأكيد فوري» يؤكد الحجز تلقائيًا بعد الدفع. «يحتاج تأكيد» يضعه بانتظار موافقتك.
        </p>
      </Card>

      {state.error ? (
        <p role="alert" className="text-sm text-admin-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : car ? "حفظ التعديلات" : "إضافة السيارة"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/cars">إلغاء</Link>
        </Button>
      </div>
    </form>
  );
}

function TierRow({ label, rate, daily }: { label: string; rate: number; daily: number }) {
  const saving = tierSavingPercent(daily, rate);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-admin-text">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold text-admin-text">
          {formatSar(rate)} <span className="text-[12px] font-normal text-admin-text-muted">/ يوم</span>
        </span>
        {saving > 0 ? (
          <span className="rounded-full bg-admin-success-tint px-2 py-0.5 font-mono text-[11px] font-bold text-admin-success">
            وفّر {saving}%
          </span>
        ) : null}
      </span>
    </div>
  );
}

function Field({
  label,
  name,
  hint,
  error,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string; hint?: string; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={Boolean(error)} {...props} />
      {error ? (
        <p className="text-[12px] text-admin-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-admin-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function Select(props: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className="h-11 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
    />
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Select id={name} name={name} defaultValue={defaultValue}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
