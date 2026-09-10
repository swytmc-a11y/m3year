"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";

const BranchLocationMap = dynamic(
  () => import("./branch-location-map").then((m) => m.BranchLocationMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-lg border border-admin-border bg-admin-surface2 text-sm text-admin-text-muted"
        style={{ height: 320 }}
      >
        جارٍ تحميل الخريطة...
      </div>
    ),
  },
);

/**
 * Replaces the old "paste latitude/longitude you copied from Google Maps"
 * text fields with an actual map: click anywhere, or drag the pin, and the
 * two hidden inputs this renders (name="latitude"/"longitude") carry the
 * value into the surrounding <form> exactly like the old text fields did —
 * the server action and validation schema don't change at all.
 */
export function BranchLocationPicker({
  initialLat,
  initialLng,
}: {
  initialLat: number | null;
  initialLng: number | null;
}) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null,
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>موقع الفرع</Label>
      <BranchLocationMap
        initialLat={initialLat}
        initialLng={initialLng}
        onChange={(lat, lng) => setCoords({ lat, lng })}
      />
      <p className="text-[12px] text-admin-text-muted">
        {coords
          ? `الإحداثيات المحدَّدة: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
          : "اضغط على موقع الفرع في الخريطة لتحديده، أو اسحب الدبوس بعد وضعه."}
      </p>
      <input type="hidden" name="latitude" value={coords?.lat ?? ""} readOnly />
      <input type="hidden" name="longitude" value={coords?.lng ?? ""} readOnly />
    </div>
  );
}
