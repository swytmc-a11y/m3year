import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/ui";
import { VerifiedBadge, StatusBadge, Metric } from "@/components/listings";
import { supabase } from "@/lib/supabase";
import {
  SECTOR_LABELS,
  formatSar,
  formatPercentage,
  formatDate,
  type Listing,
} from "@/lib/constants";
import { colors, fonts, radius } from "@/theme";

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: qError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", String(id))
        .maybeSingle();
      if (!active) return;
      if (qError) {
        console.error("[listing] load failed", qError);
        setError(true);
      } else {
        setListing(data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const isVerified = listing?.verification_status === "verified";
  const isPreview = listing ? listing.status !== "published" : false;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.paper }}
      edges={["top"]}
    >
      <TopBar title="تفاصيل المشروع" onBack={() => router.back()} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : error || !listing ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.mutedText,
              textAlign: "center",
            }}
          >
            {error
              ? "تعذّر تحميل الإعلان الآن."
              : "هذا الإعلان غير متاح أو غير منشور."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {isPreview ? (
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 10,
                backgroundColor: colors.white,
                borderColor: colors.grid,
                borderWidth: 1,
                borderRadius: radius.md,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: colors.mutedText,
                  flex: 1,
                  textAlign: "right",
                }}
              >
                معاينة — هذا الإعلان غير منشور للعامة.
              </Text>
              <StatusBadge status={listing.status} />
            </View>
          ) : null}

          <View
            style={{
              backgroundColor: colors.white,
              borderColor: colors.grid,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: 24,
              gap: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 22,
                    color: colors.ink,
                    textAlign: "right",
                  }}
                >
                  {listing.title}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.mutedText,
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  قطاع {SECTOR_LABELS[listing.sector]} · {listing.city}
                </Text>
              </View>
              {isVerified ? <VerifiedBadge /> : null}
            </View>

            <View
              style={{
                flexDirection: "row-reverse",
                gap: 40,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.grid,
                borderStyle: "dashed",
                paddingVertical: 18,
              }}
            >
              <Metric
                label="الإيراد الشهري"
                value={formatSar(listing.monthly_revenue)}
              />
              <Metric
                label="النسبة المطروحة"
                value={formatPercentage(listing.offered_percentage)}
                amber
              />
            </View>

            {listing.description ? (
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 15,
                  lineHeight: 28,
                  color: colors.ink,
                  textAlign: "right",
                }}
              >
                {listing.description}
              </Text>
            ) : null}

            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.mutedText,
                textAlign: "right",
              }}
            >
              {isVerified && listing.verified_at
                ? `تحقق محاسبي: ${formatDate(listing.verified_at)}`
                : "لم يُوثّق هذا الإعلان ماليًا بعد."}
            </Text>

            {!isPreview ? (
              <View
                style={{
                  backgroundColor: colors.paper,
                  borderRadius: radius.md,
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: colors.mutedText,
                    textAlign: "center",
                  }}
                >
                  التواصل الداخلي مع صاحب المشروع يُفعّل في مرحلة قادمة.
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              color: colors.mutedText,
              textAlign: "center",
            }}
          >
            معيار منصة إعلانات وتوثيق فقط — صفقة الشراكة تتم خارج المنصة.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
