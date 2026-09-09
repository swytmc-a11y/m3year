import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBanner } from "@/app/actions/banners";
import { BannerForm } from "@/components/admin/banner-form";
import { fetchBannerTargets } from "@/app/admin/banners/targets";

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: banner } = await supabase
    .from("promo_banners")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!banner) notFound();

  const { cars, branches } = await fetchBannerTargets(supabase);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-admin-text">
        تعديل بنر{banner.title ? ` — ${banner.title}` : ""}
      </h1>
      <BannerForm banner={banner} cars={cars} branches={branches} action={updateBanner} />
    </div>
  );
}
