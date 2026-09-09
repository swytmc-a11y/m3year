"use client";

import { useActionState } from "react";
import { updateSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";

const initial: ActionState = {};

export function SettingsForm({ settings }: { settings: Record<string, unknown> }) {
  const [state, formAction, pending] = useActionState(updateSettings, initial);
  const get = (key: string, fallback = "") => {
    const v = settings[key];
    return v == null ? fallback : String(v);
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">الضريبة والأسعار</h2>

        <Field
          label="نسبة ضريبة القيمة المضافة"
          name="vat_rate"
          defaultValue={get("vat_rate", "0.15")}
          hint="كنسبة عشرية: 0.15 تعني ١٥٪"
        />

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="prices_include_vat"
            defaultChecked={settings.prices_include_vat !== false}
            className="mt-1 size-4 accent-admin-primary"
          />
          <span>
            <span className="text-sm text-admin-text">الأسعار المُدخلة شاملة الضريبة</span>
            <span className="mt-1 block text-[12px] text-admin-text-muted">
              قواعد عرض الأسعار للمستهلك في السعودية تتطلب عرض السعر شاملًا الضريبة. إبقاؤه
              مفعّلًا يعني أن ما تُدخله هو ما يراه العميل، والضريبة تُستخرج منه لا تُضاف عليه.
            </span>
          </span>
        </label>
      </Card>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">شرائح التسعير</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="بداية السعر الأسبوعي (أيام)" name="weekly_threshold_days" defaultValue={get("weekly_threshold_days", "7")} />
          <Field label="بداية السعر الشهري (أيام)" name="monthly_threshold_days" defaultValue={get("monthly_threshold_days", "30")} />
        </div>
      </Card>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">الحجز والإلغاء</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="مهلة الدفع (دقائق)"
            name="payment_window_minutes"
            defaultValue={get("payment_window_minutes", "30")}
            hint="بعدها يسقط الحجز وتتحرر السيارة"
          />
          <Field
            label="مهلة تأكيد الفرع (ساعات)"
            name="confirmation_sla_hours"
            defaultValue={get("confirmation_sla_hours", "2")}
          />
          <Field
            label="إلغاء مجاني قبل (ساعات)"
            name="cancellation_free_hours"
            defaultValue={get("cancellation_free_hours", "24")}
          />
          <Field
            label="نسبة الاسترداد بعدها (٪)"
            name="cancellation_late_refund_percent"
            defaultValue={get("cancellation_late_refund_percent", "50")}
          />
        </div>
      </Card>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">التواصل</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="هاتف الدعم" name="support_phone" defaultValue={get("support_phone")} dir="ltr" />
          <Field label="واتساب الدعم" name="support_whatsapp" defaultValue={get("support_whatsapp")} dir="ltr" />
        </div>
      </Card>

      {state.error ? (
        <p role="alert" className="text-sm text-admin-danger">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-admin-success">تم حفظ الإعدادات.</p>
      ) : null}

      <div>
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} dir={props.dir ?? "ltr"} {...props} />
      {hint ? <p className="text-[12px] text-admin-text-muted">{hint}</p> : null}
    </div>
  );
}
