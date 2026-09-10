import { describe, expect, it } from "vitest";
import { deliveryLegs, estimateDeliveryFee, EMPTY_DELIVERY } from "@/lib/delivery-fee";

const ZONES = [
  { id: "z1", name: "شمال جدة", city: "جدة", fee: 60, note: null, branch_id: "b1" },
  { id: "z2", name: "وسط جدة", city: "جدة", fee: 40, note: null, branch_id: null },
];

describe("delivery fee", () => {
  it("charges nothing when both ends are at the branch", () => {
    expect(deliveryLegs(EMPTY_DELIVERY)).toBe(0);
    expect(estimateDeliveryFee({ ...EMPTY_DELIVERY, zoneId: "z1" }, ZONES)).toBe(0);
  });

  it("charges the zone fee once per leg the customer asked for", () => {
    const one = { ...EMPTY_DELIVERY, deliveryMode: "delivery" as const, zoneId: "z1" };
    expect(estimateDeliveryFee(one, ZONES)).toBe(60);

    const both = { ...one, returnMode: "pickup" as const };
    expect(deliveryLegs(both)).toBe(2);
    expect(estimateDeliveryFee(both, ZONES)).toBe(120);
  });

  it("charges for a collection even when the pickup was at the branch", () => {
    const collect = { ...EMPTY_DELIVERY, returnMode: "pickup" as const, zoneId: "z2" };
    expect(estimateDeliveryFee(collect, ZONES)).toBe(40);
  });

  it("charges nothing while no zone is chosen yet", () => {
    const noZone = { ...EMPTY_DELIVERY, deliveryMode: "delivery" as const };
    expect(estimateDeliveryFee(noZone, ZONES)).toBe(0);
  });
});
