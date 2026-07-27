"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SECTOR_OPTIONS } from "@/lib/listings/constants";
import type { Franchise } from "@/lib/franchises/constants";
import { emptyActionState, type ActionState } from "@/lib/action-state";

type FranchiseFormAction = (
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

export function FranchiseForm({
  action,
  franchise,
}: {
  action: FranchiseFormAction;
  franchise: Franchise;
}) {
  const [state, formAction, pending] = useActionState(action, emptyActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="brand_name">اسم العلامة التجارية</Label>
        <Input
          id="brand_name"
          name="brand_name"
          defaultValue={franchise.brand_name}
          maxLength={140}
          required
        />
        <FieldError messages={errors.brand_name} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sector">القطاع</Label>
          <Select id="sector" name="sector" defaultValue={franchise.sector} required>
            {SECTOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FieldError messages={errors.sector} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">مدينة المقر الرئيسي</Label>
          <Input id="city" name="city" defaultValue={franchise.city} maxLength={60} required />
          <FieldError messages={errors.city} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="franchise_fee">رسوم الامتياز (ر.س)</Label>
        <Input
          id="franchise_fee"
          name="franchise_fee"
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          dir="ltr"
          className="text-left font-mono"
          defaultValue={franchise.franchise_fee}
          required
        />
        <FieldError messages={errors.franchise_fee} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="initial_investment_min">أدنى استثمار مبدئي (ر.س، اختياري)</Label>
          <Input
            id="initial_investment_min"
            name="initial_investment_min"
            type="number"
            inputMode="decimal"
            min={0}
            dir="ltr"
            className="text-left font-mono"
            defaultValue={franchise.initial_investment_min ?? ""}
          />
          <FieldError messages={errors.initial_investment_min} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="initial_investment_max">أقصى استثمار مبدئي (ر.س، اختياري)</Label>
          <Input
            id="initial_investment_max"
            name="initial_investment_max"
            type="number"
            inputMode="decimal"
            min={0}
            dir="ltr"
            className="text-left font-mono"
            defaultValue={franchise.initial_investment_max ?? ""}
          />
          <FieldError messages={errors.initial_investment_max} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="royalty_percentage">نسبة الإتاوة (٪، اختياري)</Label>
          <Input
            id="royalty_percentage"
            name="royalty_percentage"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            dir="ltr"
            className="text-left font-mono"
            defaultValue={franchise.royalty_percentage ?? ""}
          />
          <FieldError messages={errors.royalty_percentage} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="required_space_sqm">المساحة المطلوبة (م²، اختياري)</Label>
          <Input
            id="required_space_sqm"
            name="required_space_sqm"
            type="number"
            inputMode="decimal"
            min={0}
            dir="ltr"
            className="text-left font-mono"
            defaultValue={franchise.required_space_sqm ?? ""}
          />
          <FieldError messages={errors.required_space_sqm} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="required_employees_count">عدد الموظفين المطلوب (اختياري)</Label>
          <Input
            id="required_employees_count"
            name="required_employees_count"
            type="number"
            inputMode="numeric"
            min={0}
            dir="ltr"
            className="text-left font-mono"
            defaultValue={franchise.required_employees_count ?? ""}
          />
          <FieldError messages={errors.required_employees_count} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="expected_payback_months">مدة استرداد رأس المال (أشهر، اختياري)</Label>
          <Input
            id="expected_payback_months"
            name="expected_payback_months"
            type="number"
            inputMode="numeric"
            min={0}
            dir="ltr"
            className="text-left font-mono"
            defaultValue={franchise.expected_payback_months ?? ""}
          />
          <FieldError messages={errors.expected_payback_months} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="founding_year">سنة تأسيس العلامة (اختياري)</Label>
          <Input
            id="founding_year"
            name="founding_year"
            type="number"
            inputMode="numeric"
            min={1950}
            max={2100}
            dir="ltr"
            className="text-left font-mono"
            defaultValue={franchise.founding_year ?? ""}
          />
          <FieldError messages={errors.founding_year} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="current_branches_count">عدد الفروع الحالية (اختياري)</Label>
          <Input
            id="current_branches_count"
            name="current_branches_count"
            type="number"
            inputMode="numeric"
            min={0}
            dir="ltr"
            className="text-left font-mono"
            defaultValue={franchise.current_branches_count ?? ""}
          />
          <FieldError messages={errors.current_branches_count} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          name="training_provided"
          defaultChecked={franchise.training_provided}
          className="h-4 w-4 rounded border-grid"
        />
        يشمل الامتياز تدريبًا للمشغّل الجديد
      </label>

      <div className="flex flex-col gap-2">
        <Label htmlFor="operational_support">الدعم التشغيلي (اختياري)</Label>
        <Textarea
          id="operational_support"
          name="operational_support"
          defaultValue={franchise.operational_support ?? ""}
          maxLength={2000}
          rows={3}
        />
        <FieldError messages={errors.operational_support} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="marketing_support">الدعم التسويقي (اختياري)</Label>
        <Textarea
          id="marketing_support"
          name="marketing_support"
          defaultValue={franchise.marketing_support ?? ""}
          maxLength={2000}
          rows={3}
        />
        <FieldError messages={errors.marketing_support} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">وصف العلامة (اختياري)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={franchise.description ?? ""}
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
        <Button type="submit" disabled={pending}>
          {pending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </Button>
      </div>
      <p className="text-xs text-ink/50">
        التعديل كمدير لا يغيّر حالة الامتياز (منشور/مسودة/إلخ) — يُعدَّل
        المحتوى فقط.
      </p>
    </form>
  );
}
