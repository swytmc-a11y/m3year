import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DeliveryZones } from "@/components/admin/delivery-zones";

export default async function AdminDeliveryZonesPage() {
  const supabase = await createClient();
  const [{ data: zones }, { data: branches }] = await Promise.all([
    supabase
      .from("delivery_zones")
      .select("id, name, city, fee, note, is_active, branch_id")
      .order("city")
      .order("sort_order"),
    supabase.from("branches").select("id, name, city").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-admin-text">مناطق التوصيل</h1>
      <p className="mb-8 text-[13px] leading-relaxed text-admin-text-muted">
        تُحتسب الرسوم لكل رحلة: توصيل السيارة للعميل رحلة، واستلامها منه رحلة أخرى.
        المنطقة بلا فرع تُعرض على سيارات كل الفروع.
      </p>

      {(zones ?? []).length === 0 ? (
        <Card className="mb-6 border-admin-border bg-admin-surface text-center text-[13px] text-admin-text-muted">
          لا توجد مناطق بعد — لن يظهر خيار التوصيل في التطبيق حتى تضيف واحدة.
        </Card>
      ) : null}

      <DeliveryZones zones={zones ?? []} branches={branches ?? []} />
    </div>
  );
}
