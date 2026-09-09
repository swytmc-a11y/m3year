import { useRef, useState } from "react";
import { View, Text, ScrollView, Linking, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Tappable } from "@/components/kit";
import { useTheme } from "@/contexts/theme";
import { bannerHref, type Banner } from "@/lib/banners";
import { fonts, radius } from "@/theme";

const SIDE_PADDING = 18;
const GAP = 10;

/**
 * The merchandising strip at the top of the feed. Renders nothing when there
 * are no live banners, so an operator who has not made one sees no gap.
 */
export function PromoBanners({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const { t } = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const cardWidth = width - SIDE_PADDING * 2;

  if (banners.length === 0) return null;

  function onPress(b: Banner) {
    const href = bannerHref(b);
    if (!href) return;
    // External links are validated as https at write time; everything else
    // is an in-app route.
    if (href.startsWith("https://")) {
      Linking.openURL(href);
      return;
    }
    router.push(href as never);
  }

  return (
    <View style={{ gap: 8 }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + GAP}
        contentContainerStyle={{ paddingHorizontal: SIDE_PADDING, gap: GAP }}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + GAP)));
        }}
      >
        {banners.map((b) => (
          <Tappable
            key={b.id}
            onPress={() => onPress(b)}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={b.title ?? "عرض"}
          >
            <View
              style={{
                width: cardWidth,
                aspectRatio: 21 / 9,
                borderRadius: radius.xl,
                overflow: "hidden",
                backgroundColor: t.surface2,
                justifyContent: "flex-end",
              }}
            >
              <Image
                source={{ uri: b.image_url }}
                style={{ position: "absolute", inset: 0 }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />

              {/* Only drawn when there is text to protect — a scrim over a
                  clean image is just dirt on it. */}
              {b.title || b.subtitle ? (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: "rgba(0,0,0,0.45)",
                  }}
                >
                  {b.title ? (
                    <Text
                      style={{
                        fontFamily: fonts.displayBold,
                        fontSize: 16,
                        color: "#FFFFFF",
                        textAlign: "right",
                      }}
                    >
                      {b.title}
                    </Text>
                  ) : null}
                  {b.subtitle ? (
                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 12.5,
                        color: "rgba(255,255,255,0.88)",
                        textAlign: "right",
                        marginTop: 2,
                      }}
                    >
                      {b.subtitle}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Tappable>
        ))}
      </ScrollView>

      {banners.length > 1 ? (
        <View style={{ flexDirection: "row-reverse", justifyContent: "center", gap: 5 }}>
          {banners.map((b, i) => (
            <View
              key={b.id}
              style={{
                width: i === index ? 16 : 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: i === index ? t.primary : t.border,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
