import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCar } from "@/app/actions/cars";
import { CarForm } from "@/components/admin/car-form";

export default async function NewCarPage() {
  const supabase = await createClient();

  const [{ data: branches }, { data: addons }] = await Promise.all([
    supabase.from("branches").select("id, name, city").eq("is_active", true).order("name"),
    supabase.from("addons").select("*").eq("is_active", true).order("sort_order"),
  ]);

  // A car cannot exist without a branch, so send the operator to make one
  // rather than showing a form that cannot be submitted.
  if (!branches || branches.length === 0) redirect("/admin/branches/new");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-admin-text">إضافة سيارة</h1>
      <CarForm branches={branches} addons={addons ?? []} carAddons={[]} action={createCar} />
    </div>
  );
}
