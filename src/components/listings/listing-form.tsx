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
}: {
  action: ListingFormAction;
  listing?: Listing;
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
        <Button
          type="submit"
          name="intent"
          value="submit"
          disabled={pending}
        >
          {pending ? "جارٍ الحفظ..." : "إرسال للمراجعة"}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="draft"
          variant="ghost"
          disabled={pending}
        >
          حفظ كمسودة
        </Button>
      </div>

      <p className="text-xs text-ink/50">
        الإعلانات لا تُنشر مباشرة — يراجعها فريق معيار أولًا، ثم تظهر للعامة
        بعد الموافقة.
      </p>
    </form>
  );
}
