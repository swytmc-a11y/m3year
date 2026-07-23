"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SECTOR_OPTIONS, type Listing } from "@/lib/listings/constants";
import { emptyActionState, type ActionState } from "@/lib/action-state";

type ListingFormAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p role="alert" className="text-sm text-amber">
      {messages[0]}
    </p>
  );
}

export function ListingForm({
  action,
  listing,
  isAdmin = false,
}: {
  action: ListingFormAction;
  listing?: Listing;
  isAdmin?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, emptyActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">عنوان المشروع</Label>
        <Input
          id="title"
          name="title"
          placeholder="مثال: كوفي شوب — حي الروضة، جدة"
          defaultValue={listing?.title ?? ""}
          maxLength={140}
          required
        />
        <FieldError messages={errors.title} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sector">القطاع</Label>
          <Select
            id="sector"
            name="sector"
            defaultValue={listing?.sector ?? "cafe"}
            required
          >
            {SECTOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FieldError messages={errors.sector} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="city">المدينة</Label>
          <Input
            id="city"
            name="city"
            placeholder="مثال: جدة"
            defaultValue={listing?.city ?? ""}
            maxLength={60}
            required
          />
          <FieldError messages={errors.city} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="monthly_revenue">الإيراد الشهري (ر.س)</Label>
          <Input
            id="monthly_revenue"
            name="monthly_revenue"
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            placeholder="48200"
            dir="ltr"
            className="text-left font-mono"
            defaultValue={listing?.monthly_revenue ?? ""}
            required
          />
          <FieldError messages={errors.monthly_revenue} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="offered_percentage">النسبة المطروحة (٪)</Label>
          <Input
            id="offered_percentage"
            name="offered_percentage"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.5"
            placeholder="25"
            dir="ltr"
            className="text-left font-mono"
            defaultValue={listing?.offered_percentage ?? ""}
            required
          />
          <FieldError messages={errors.offered_percentage} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="asking_price">سعر البيع أو المبلغ المطلوب (ر.س، اختياري)</Label>
          <Input
            id="asking_price"
            name="asking_price"
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            placeholder="500000"
            dir="ltr"
            className="text-left font-mono"
            defaultValue={listing?.asking_price ?? ""}
          />
          <FieldError messages={errors.asking_price} />
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              name="price_negotiable"
              defaultChecked={listing?.price_negotiable ?? true}
              className="h-4 w-4 rounded border-grid"
            />
            السعر قابل للتفاوض
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="monthly_profit">صافي الربح الشهري (ر.س، اختياري)</Label>
          <Input
            id="monthly_profit"
            name="monthly_profit"
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            placeholder="15000"
            dir="ltr"
            className="text-left font-mono"
            defaultValue={listing?.monthly_profit ?? ""}
          />
          <FieldError messages={errors.monthly_profit} />
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              name="show_profit"
              defaultChecked={listing?.show_profit ?? false}
              className="h-4 w-4 rounded border-grid"
            />
            إظهار الرقم مباشرة (بدل «متاح عند التواصل»)
          </label>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="founding_year">سنة التأسيس (اختياري)</Label>
          <Input
            id="founding_year"
            name="founding_year"
            type="number"
            inputMode="numeric"
            min={1950}
            max={2100}
            step="1"
            placeholder="2019"
            dir="ltr"
            className="text-left font-mono"
            defaultValue={listing?.founding_year ?? ""}
          />
          <FieldError messages={errors.founding_year} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="employee_count">عدد الموظفين (اختياري)</Label>
          <Input
            id="employee_count"
            name="employee_count"
            type="number"
            inputMode="numeric"
            min={0}
            step="1"
            placeholder="6"
            dir="ltr"
            className="text-left font-mono"
            defaultValue={listing?.employee_count ?? ""}
          />
          <FieldError messages={errors.employee_count} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">وصف المشروع (اختياري)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="نبذة عن المشروع، سبب البحث عن شريك، وما يميّزه."
          defaultValue={listing?.description ?? ""}
          maxLength={5000}
          rows={5}
        />
        <FieldError messages={errors.description} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-amber">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" name="intent" value="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : isAdmin ? "حفظ التعديلات" : "إرسال للمراجعة"}
        </Button>
        {!isAdmin ? (
          <Button
            type="submit"
            name="intent"
            value="draft"
            variant="ghost"
            disabled={pending}
          >
            حفظ كمسودة
          </Button>
        ) : null}
      </div>

      {isAdmin ? (
        <p className="text-xs text-ink/50">
          التعديل كمدير لا يغيّر حالة الإعلان (منشور/مسودة/إلخ) — يُعدَّل
          المحتوى فقط.
        </p>
      ) : (
        <p className="text-xs text-ink/50">
          الإعلانات لا تُنشر مباشرة — يراجعها فريق معيار أولًا، ثم تظهر للعامة
          بعد الموافقة.
        </p>
      )}
    </form>
  );
}
