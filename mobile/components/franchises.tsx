import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Tappable, Card, staggerEnter } from "@/components/kit";
import { MiyarBadge } from "@/components/miyar-index";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";
import { Metric, VerifiedBadge } from "@/components/listings";
import { SECTOR_LABELS, formatSar } from "@/lib/constants";
import { formatSarRange, type Franchise } from "@/lib/franchise-constants";

export function FranchiseCard({ franchise, index = 0 }: { franchise: Franchise; index?: number }) {
  const router = useRouter();
  const { t } = useTheme();
  const isVerified = franchise.verification_status === "verified";
  const cover = franchise.logo_url ?? franchise.photo_urls?.[0];

  return (
    <Animated.View entering={staggerEnter(Math.min(index, 8))}>
      <Tappable onPress={() => router.push(`/franchises/${franchise.id}`)} haptic="light">
        <Card style={{ padding: 20 }}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={{ width: "100%", height: 140, borderRadius: radius.lg, marginBottom: 14, backgroundColor: t.surface2 }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : null}

          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: t.text, textAlign: "right" }}>
                {franchise.brand_name}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, marginTop: 4, textAlign: "right" }}>
                قطاع {SECTOR_LABELS[franchise.sector]} · {franchise.city}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <MiyarBadge grade={franchise.miyar_grade} />
              {isVerified ? <VerifiedBadge /> : null}
            </View>
          </View>

          <View
            style={{
              flexDirection: "row-reverse",
              flexWrap: "wrap",
              gap: 32,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: t.border,
              paddingVertical: 14,
              marginBottom: 14,
            }}
          >
            <Metric label="رسوم الامتياز" value={formatSar(franchise.franchise_fee)} />
            <Metric
              label="الاستثمار المبدئي"
              value={formatSarRange(franchise.initial_investment_min, franchise.initial_investment_max, formatSar)}
              amber
            />
          </View>

          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>
              {isVerified ? "امتياز موثّق" : "بانتظار التوثيق المالي"}
            </Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: t.text }}>التفاصيل ←</Text>
          </View>
        </Card>
      </Tappable>
    </Animated.View>
  );
}
