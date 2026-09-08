"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONFIRMATION_MODE_OPTIONS } from "@/lib/cars/constants";
import type { ActionState } from "@/lib/action-state";
import type { Tables } from "@/lib/supabase/database.types";

type Branch = Tables<"branches">;

const initial: ActionState = {};

export function BranchForm({
  branch,
  action,
}: {
  branch?: Branch;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">بيانات الفرع</h2>

        <Field label="اسم الفرع" name="name" defaultValue={branch?.name} required error={errors.name?.[0]} />
        <Field label="المدينة" name="city" defaultValue={branch?.city} required error={errors.city?.[0]} />
        <Field label="العنوان" name="address" defaultValue={branch?.address ?? ""} error={errors.address?.[0]} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="خط العرض (Latitude)"
            name="latitude"
            defaultValue={branch?.latitude?.toString() ?? ""}
            dir="ltr"
            hint="من خرائط جوجل — يُستخدم لترتيب «الأقرب لي»"
            error={errors.latitude?.[0]}
          />
          <Field
            label="خط الطول (Longitude)"
            name="longitude"
            defaultValue={branch?.longitude?.toString() ?? ""}
            dir="ltr"
            error={errors.longitude?.[0]}
          />
        </div>
      </Card>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">التواصل والدوام</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم الهاتف" name="phone" defaultValue={branch?.phone ?? ""} dir="ltr" error={errors.phone?.[0]} />
          <Field label="واتساب" name="whatsapp" defaultValue={branch?.whatsapp ?? ""} dir="ltr" error={errors.whatsapp?.[0]} />
        </div>

        <Field
          label="ساعات العمل"
          name="working_hours"
          defaultValue={branch?.working_hours ?? ""}
          hint="مثال: السبت–الخميس ٨ص–١٠م · الجمعة ٤م–١٠م"
          error={errors.working_hours?.[0]}
        />
      </Card>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">الإعدادات</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="deposit_note">تنويه مبلغ التأمين</Label>
          <Textarea
            id="deposit_note"
            name="deposit_note"
            rows={3}
            defaultValue={branch?.deposit_note ?? ""}
            placeholder="قد يُطلب مبلغ تأمين مسترد يُحدَّد عند الاستلام."
          />
          <p className="text-[12px] text-admin-text-muted">
            يظهر للعميل في صفحة السيارة وفي تأكيد الحجز. لا يُحصَّل عبر التطبيق — يُسوّى في الفرع.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="default_confirmation_mode">وضع التأكيد الافتراضي للسيارات الجديدة</Label>
          <select
            id="default_confirmation_mode"
            name="default_confirmation_mode"
            defaultValue={branch?.default_confirmation_mode ?? "manual"}
            className="h-11 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
          >
            {CONFIRMATION_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-admin-text-muted">
            يمكن تجاوزه لكل سيارة على حدة.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="ترتيب العرض"
            name="sort_order"
            type="number"
            defaultValue={(branch?.sort_order ?? 0).toString()}
            dir="ltr"
            error={errors.sort_order?.[0]}
          />
          <label className="flex items-center gap-3 self-end pb-2">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={branch ? branch.is_active : true}
              className="size-4 accent-admin-primary"
            />
            <span className="text-sm text-admin-text">الفرع نشط</span>
          </label>
        </div>
      </Card>

      {state.error ? (
        <p role="alert" className="text-sm text-admin-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : branch ? "حفظ التعديلات" : "إضافة الفرع"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/branches">إلغاء</Link>
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
