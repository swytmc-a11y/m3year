"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/action-state";
import type { Tables } from "@/lib/supabase/database.types";

type Coupon = Tables<"coupons">;

const initial: ActionState = {};

/** timestamptz -> the yyyy-MM-ddTHH:mm a datetime-local input expects. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CouponForm({
  coupon,
  action,
}: {
  coupon?: Coupon;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const errors = state.fieldErrors ?? {};

  // Drives the labels and which cap makes sense: a ceiling only means
  // something for a percentage.
  const [kind, setKind] = useState<"percent" | "fixed">(coupon?.discount_type ?? "percent");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">الرمز</h2>

        <Field
          label="رمز الخصم"
          name="code"
          defaultValue={coupon?.code}
          required
          dir="ltr"
          placeholder="WELCOME20"
          hint="يكتبه العميل في شاشة الحجز. تُقبل الحروف الإنجليزية والأرقام."
          error={errors.code?.[0]}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">وصف مختصر</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={coupon?.description ?? ""}
            placeholder="خصم ترحيبي للعملاء الجدد"
          />
          <p className="text-[12px] text-admin-text-muted">
            يظهر للعميل عند قبول الرمز.
          </p>
        </div>
      </Card>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">قيمة الخصم</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="discount_type">نوع الخصم</Label>
            <select
              id="discount_type"
              name="discount_type"
              value={kind}
              onChange={(e) => setKind(e.target.value as "percent" | "fixed")}
              className="h-11 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
            >
              <option value="percent">نسبة مئوية</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </div>

          <Field
            label={kind === "percent" ? "النسبة (٪)" : "المبلغ (ر.س)"}
            name="discount_value"
            type="number"
            step="0.01"
            defaultValue={coupon?.discount_value?.toString() ?? ""}
            required
            dir="ltr"
            error={errors.discount_value?.[0]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {kind === "percent" ? (
            <Field
              label="أقصى خصم (ر.س)"
              name="max_discount"
              type="number"
              step="0.01"
              defaultValue={coupon?.max_discount?.toString() ?? ""}
              dir="ltr"
              hint="يمنع أن يتضخم الخصم على إيجار طويل. اتركه فارغًا لبلا سقف."
              error={errors.max_discount?.[0]}
            />
          ) : (
            // The field must still exist in the payload; a fixed coupon has
            // no ceiling to speak of.
            <input type="hidden" name="max_discount" value="" />
          )}

          <Field
            label="الحد الأدنى لقيمة الحجز (ر.س)"
            name="min_total"
            type="number"
            step="0.01"
            defaultValue={coupon?.min_total?.toString() ?? ""}
            dir="ltr"
            hint="اتركه فارغًا ليعمل على أي حجز."
            error={errors.min_total?.[0]}
          />
        </div>
      </Card>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">الصلاحية والحدود</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="يبدأ في"
            name="starts_at"
            type="datetime-local"
            defaultValue={toLocalInput(coupon?.starts_at ?? null)}
            dir="ltr"
            hint="اتركه فارغًا ليبدأ فورًا."
            error={errors.starts_at?.[0]}
          />
          <Field
            label="ينتهي في"
            name="ends_at"
            type="datetime-local"
            defaultValue={toLocalInput(coupon?.ends_at ?? null)}
            dir="ltr"
            hint="اتركه فارغًا لبلا انتهاء."
            error={errors.ends_at?.[0]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="إجمالي مرات الاستخدام"
            name="max_redemptions"
            type="number"
            defaultValue={coupon?.max_redemptions?.toString() ?? ""}
            dir="ltr"
            hint="اتركه فارغًا لعدد غير محدود."
            error={errors.max_redemptions?.[0]}
          />
          <Field
            label="مرات الاستخدام لكل عميل"
            name="max_per_customer"
            type="number"
            defaultValue={(coupon?.max_per_customer ?? 1).toString()}
            dir="ltr"
            error={errors.max_per_customer?.[0]}
          />
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={coupon ? coupon.is_active : true}
            className="size-4 accent-admin-primary"
          />
          <span className="text-sm text-admin-text">الرمز مفعّل</span>
        </label>

        <p className="text-[12px] text-admin-text-muted">
          الحجز الملغى يعيد استخدامه للعميل — المرات تُحسب من الحجوزات القائمة فقط.
        </p>
      </Card>

      {state.error ? (
        <p role="alert" className="text-sm text-admin-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : coupon ? "حفظ التعديلات" : "إضافة الرمز"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/coupons">إلغاء</Link>
        </Button>
      </div>
    </form>
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
