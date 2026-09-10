import { useState } from "react";
import { View, Text, Image, Linking } from "react-native";
import { Tappable } from "@/components/kit";
import { PinIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { staticMapUrl, googleMapsUrl } from "@/lib/static-map";
import { fonts, radius } from "@/theme";

/**
 * A small map preview for a branch's location, under its details on the car
 * and branch screens. Tapping it hands off to the Google Maps app (or the
 * browser) — the preview itself is a free static-tile image, not a live SDK
 * map, so there's no API key to provision for what is a read-only glance.
 *
 * Renders nothing when the branch has no pin yet (latitude/longitude null),
 * same as every other optional branch field on these screens.
 */
export function BranchMapCard({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const { t } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);

  if (latitude == null || longitude == null) return null;

  return (
    <Tappable
      onPress={() => Linking.openURL(googleMapsUrl(latitude, longitude))}
      style={{ borderRadius: radius.lg, overflow: "hidden", backgroundColor: t.well }}
    >
      {imageFailed ? (
        <View style={{ height: 130, alignItems: "center", justifyContent: "center" }}>
          <PinIcon color={t.textMuted} size={22} />
        </View>
      ) : (
        <Image
          source={{ uri: staticMapUrl(latitude, longitude) }}
          style={{ width: "100%", height: 130 }}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      )}
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: t.border,
          backgroundColor: t.surface,
        }}
      >
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
          <PinIcon color={t.primary} size={13} />
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.text }}>
            افتح الموقع في خرائط قوقل
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: t.textMuted }}>‹</Text>
      </View>
    </Tappable>
  );
}
