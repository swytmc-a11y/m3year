import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCar } from "@/app/actions/cars";
import { CarForm } from "@/components/admin/car-form";
import { CarBlocks } from "@/components/admin/car-blocks";
import { carTitle } from "@/lib/cars/constants";

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: car }, { data: branches }, { data: addons }, { data: carAddons }, { data: blocks }] =
    await Promise.all([
      supabase.from("cars").select("*").eq("id", id).maybeSingle(),
      supabase.from("branches").select("id, name, city").order("name"),
      supabase.from("addons").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("car_addons").select("*").eq("car_id", id),
      supabase.from("car_blocks").select("*").eq("car_id", id).order("start_date"),
    ]);

  if (!car) notFound();

  const { data: carPrivate } = await supabase
    .from("car_private")
    .select("*")
    .eq("car_id", id)
    .maybeSingle();

  const action = updateCar.bind(null, car.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-admin-text">
        تعديل — {carTitle(car)}
      </h1>

      <CarForm
        car={car}
        carPrivate={carPrivate}
        branches={branches ?? []}
        addons={addons ?? []}
        carAddons={carAddons ?? []}
        action={action}
      />

      <div className="mt-10">
        <CarBlocks carId={car.id} blocks={blocks ?? []} />
      </div>
    </div>
  );
}
