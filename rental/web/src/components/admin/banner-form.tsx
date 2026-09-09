"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/admin/image-uploader";
import { CAR_CATEGORY_OPTIONS } from "@/lib/cars/constants";
import type { ActionState } from "@/lib/action-state";
import type { Tables } from "@/lib/supabase/database.types";

type Banner = Tables<"promo_banners">;
type TargetKind = Banner["target_kind"];

const initial: ActionState = {};

const TARGET_OPTIONS: { value: TargetKind; label: string }[] = [
  { value: "none", label: "بدون وجهة (للعرض فقط)" },
  { value: "car", label: "سيارة محددة" },
  { value: "category", label: "فئة سيارات" },
  { value: "branch", label: "الفروع" },
  { value: "coupon", label: "رمز خصم" },
  { value: "url", label: "رابط خارجي" },
];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BannerForm({
  banner,
  cars,
  branches,
  action,
}: {
  banner?: Banner;
  cars: { id: string; label: string }[];
  branches: { id: string; label: string }[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const errors = state.fieldErrors ?? {};
  const [kind, setKind] = useState<TargetKind>(banner?.target_kind ?? "none");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">الصورة والنص</h2>

        <div className="flex flex-col gap-2">
          <Label>صورة البنر</Label>
          <ImageUploader
            name="image_url"
            defaultValue={banner?.image_url ? [banner.image_url] : []}
          />
          <p className="text-[12px] text-admin-text-muted">
            الأفضل بنسبة عرض إلى ارتفاع ٢١:٩ (مثلًا ١٢٦٠×٥٤٠ بكسل). تُقصّ الصورة لتملأ المساحة.
          </p>
          {errors.image_url?.[0] ? (
            <p className="text-[12px] text-admin-danger">{errors.image_url[0]}</p>
          ) : null}
        </div>

        <Field
          label="العنوان"
          name="title"
          defaultValue={banner?.title ?? ""}
          placeholder="عرض الصيف"
          hint="اتركه فارغًا إذا كان النص مكتوبًا داخل الصورة نفسها."
          error={errors.title?.[0]}
        />
        <Field
          label="السطر الثاني"
          name="subtitle"
          defaultValue={banner?.subtitle ?? ""}
          placeholder="خصم حتى ٢٠٪ على السيارات العائلية"
          error={errors.subtitle?.[0]}
        />
      </Card>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">عند الضغط</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="target_kind">وجهة البنر</Label>
          <select
            id="target_kind"
            name="target_kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as TargetKind)}
            className="h-11 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
          >
            {TARGET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {kind === "car" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="target_car_id">السيارة</Label>
            <select
              id="target_car_id"
              name="target_car_id"
              defaultValue={banner?.target_car_id ?? ""}
              className="h-11 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
            >
              <option value="">— اختر —</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.target_car_id?.[0] ? (
              <p className="text-[12px] text-admin-danger">{errors.target_car_id[0]}</p>
            ) : null}
          </div>
        ) : null}

        {kind === "category" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="target_category">الفئة</Label>
            <select
              id="target_category"
              name="target_category"
              defaultValue={banner?.target_category ?? ""}
              className="h-11 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
            >
              <option value="">— اختر —</option>
              {CAR_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.target_category?.[0] ? (
              <p className="text-[12px] text-admin-danger">{errors.target_category[0]}</p>
            ) : null}
          </div>
        ) : null}

        {kind === "branch" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="target_branch_id">الفرع</Label>
            <select
              id="target_branch_id"
              name="target_branch_id"
              defaultValue={banner?.target_branch_id ?? ""}
              className="h-11 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
            >
              <option value="">— اختر —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            {errors.target_branch_id?.[0] ? (
              <p className="text-[12px] text-admin-danger">{errors.target_branch_id[0]}</p>
            ) : null}
          </div>
        ) : null}

        {kind === "coupon" ? (
          <Field
            label="رمز الخصم"
            name="target_coupon_code"
            defaultValue={banner?.target_coupon_code ?? ""}
            dir="ltr"
            placeholder="WELCOME20"
            hint="يُعرض للعميل ليستخدمه عند تأكيد الحجز."
            error={errors.target_coupon_code?.[0]}
          />
        ) : null}

        {kind === "url" ? (
          <Field
            label="الرابط"
            name="target_url"
            defaultValue={banner?.target_url ?? ""}
            dir="ltr"
            placeholder="https://example.com"
            hint="روابط https فقط."
            error={errors.target_url?.[0]}
          />
        ) : null}
      </Card>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="font-heading text-base font-extrabold text-admin-text">الجدولة</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="يظهر من"
            name="starts_at"
            type="datetime-local"
            defaultValue={toLocalInput(banner?.starts_at ?? null)}
            dir="ltr"
            hint="اتركه فارغًا ليظهر فورًا."
            error={errors.starts_at?.[0]}
          />
          <Field
            label="يختفي في"
            name="ends_at"
            type="datetime-local"
            defaultValue={toLocalInput(banner?.ends_at ?? null)}
            dir="ltr"
            hint="اتركه فارغًا ليبقى ظاهرًا."
            error={errors.ends_at?.[0]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="ترتيب العرض"
            name="sort_order"
            type="number"
            defaultValue={(banner?.sort_order ?? 0).toString()}
            dir="ltr"
            hint="الأصغر يظهر أولًا."
            error={errors.sort_order?.[0]}
          />
          <label className="flex items-center gap-3 self-end pb-2">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={banner ? banner.is_active : true}
              className="size-4 accent-admin-primary"
            />
            <span className="text-sm text-admin-text">البنر مفعّل</span>
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
          {pending ? "جارٍ الحفظ..." : banner ? "حفظ التعديلات" : "إضافة البنر"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/banners">إلغاء</Link>
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
