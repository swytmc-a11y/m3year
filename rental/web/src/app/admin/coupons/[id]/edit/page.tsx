import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCoupon } from "@/app/actions/coupons";
import { CouponForm } from "@/components/admin/coupon-form";

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: coupon } = await supabase.from("coupons").select("*").eq("id", id).maybeSingle();
  if (!coupon) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-admin-text">
        تعديل رمز — {coupon.code}
      </h1>
      <CouponForm coupon={coupon} action={updateCoupon} />
    </div>
  );
}
