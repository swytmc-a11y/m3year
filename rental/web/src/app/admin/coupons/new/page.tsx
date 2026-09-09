import { createCoupon } from "@/app/actions/coupons";
import { CouponForm } from "@/components/admin/coupon-form";

export default function NewCouponPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-admin-text">رمز خصم جديد</h1>
      <CouponForm action={createCoupon} />
    </div>
  );
}
