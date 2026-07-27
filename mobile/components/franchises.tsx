import { View, Text, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts, radius } from "@/theme";
import { Metric, VerifiedBadge } from "@/components/listings";
import { SECTOR_LABELS, formatSar } from "@/lib/constants";
import { formatSarRange, type Franchise } from "@/lib/franchise-constants";

export function FranchiseCard({ franchise }: { franchise: Franchise }) {
  const router = useRouter();
  const isVerified = franchise.verification_status === "verified";
  const cover = franchise.logo_url ?? franchise.photo_urls?.[0];

  return (
    <Pressable
      onPress={() => router.push(`/franchises/${franchise.id}`)}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderColor: colors.grid,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: 20,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={{
            width: "100%",
            height: 140,
            borderRadius: radius.md,
            marginBottom: 14,
            backgroundColor: colors.paper,
          }}
        />
      ) : null}

      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.bodyBold,
              fontSize: 16,
              color: colors.ink,
              textAlign: "right",
            }}
          >
            {franchise.brand_name}
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: colors.mutedText,
              marginTop: 4,
              textAlign: "right",
            }}
          >
            قطاع {SECTOR_LABELS[franchise.sector]} · {franchise.city}
          </Text>
        </View>
        {isVerified ? <VerifiedBadge /> : null}
      </View>

      <View
        style={{
          flexDirection: "row-reverse",
          flexWrap: "wrap",
          gap: 32,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.grid,
          borderStyle: "dashed",
          paddingVertical: 14,
          marginBottom: 14,
        }}
      >
        <Metric label="رسوم الامتياز" value={formatSar(franchise.franchise_fee)} />
        <Metric
          label="الاستثمار المبدئي"
          value={formatSarRange(
            franchise.initial_investment_min,
            franchise.initial_investment_max,
            formatSar,
          )}
          amber
        />
      </View>

      <View
        style={{
          flexDirection: "row-reverse",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.mutedText }}>
          {isVerified ? "امتياز موثّق" : "بانتظار التوثيق المالي"}
        </Text>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink }}>
          التفاصيل ←
        </Text>
      </View>
    </Pressable>
  );
}
