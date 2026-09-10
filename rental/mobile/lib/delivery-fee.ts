/**
 * Delivery pricing, with no I/O.
 *
 * Split from `lib/delivery.ts` so it can be unit-tested: that module imports
 * the Supabase client, which pulls React Native in and cannot be loaded by
 * the test runner.
 */
export type DeliveryZone = {
  id: string;
  name: string;
  city: string;
  fee: number;
  note: string | null;
  branch_id: string | null;
};

export type DeliveryChoice = {
  deliveryMode: "branch" | "delivery";
  returnMode: "branch" | "pickup";
  zoneId: string | null;
  address: string;
};

export const EMPTY_DELIVERY: DeliveryChoice = {
  deliveryMode: "branch",
  returnMode: "branch",
  zoneId: null,
  address: "",
};

/** Legs the customer asked for, which is what the zone fee multiplies. */
export function deliveryLegs(choice: DeliveryChoice): number {
  return (
    (choice.deliveryMode === "delivery" ? 1 : 0) +
    (choice.returnMode === "pickup" ? 1 : 0)
  );
}

/**
 * The fee shown while choosing. The charged fee is computed by the database
 * on insert; this only has to agree with it, never to be trusted by it.
 */
export function estimateDeliveryFee(
  choice: DeliveryChoice,
  zones: DeliveryZone[],
): number {
  const zone = zones.find((z) => z.id === choice.zoneId);
  if (!zone) return 0;
  return zone.fee * deliveryLegs(choice);
}
