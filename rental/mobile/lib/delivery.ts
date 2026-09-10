import { supabase } from "@/lib/supabase";
import type { DeliveryZone } from "@/lib/delivery-fee";

export {
  EMPTY_DELIVERY,
  deliveryLegs,
  estimateDeliveryFee,
} from "@/lib/delivery-fee";
export type { DeliveryZone, DeliveryChoice } from "@/lib/delivery-fee";

/**
 * Zones that can serve a given branch: the ones tied to it, plus the ones
 * offered everywhere. A zone belonging to another branch is not merely
 * hidden here — the database refuses it too, because it would commit a
 * branch to a drive it never agreed to.
 */
export async function listDeliveryZones(branchId: string): Promise<DeliveryZone[]> {
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, name, city, fee, note, branch_id")
    .eq("is_active", true)
    .or(`branch_id.eq.${branchId},branch_id.is.null`)
    .order("sort_order");

  if (error) {
    console.error("[delivery] zones failed", error);
    return [];
  }
  return (data ?? []).map((z) => ({ ...z, fee: Number(z.fee) }));
}
