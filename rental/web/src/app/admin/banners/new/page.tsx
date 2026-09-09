import { createClient } from "@/lib/supabase/server";
import { createBanner } from "@/app/actions/banners";
import { BannerForm } from "@/components/admin/banner-form";
import { fetchBannerTargets } from "@/app/admin/banners/targets";

export default async function NewBannerPage() {
  const supabase = await createClient();
  const { cars, branches } = await fetchBannerTargets(supabase);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-admin-text">بنر جديد</h1>
      <BannerForm cars={cars} branches={branches} action={createBanner} />
    </div>
  );
}
