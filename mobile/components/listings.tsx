import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Tappable, Card, DrawnCheckmark, staggerEnter } from "@/components/kit";
import { MiyarBadge } from "@/components/miyar-index";
import { useTheme } from "@/contexts/theme";
import { fonts, radius, type ThemeTokens } from "@/theme";
import {
  SECTOR_LABELS,
  LISTING_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  formatSar,
  formatPercentage,
  formatDate,
  type Listing,
  type ListingStatus,
  type VerificationStatus,
} from "@/lib/constants";

// Exactly the columns the card renders. The feed selects these instead of
// `*` so browsing doesn't pull every listing's full description text — the
// single biggest contributor to feed payload size, and never shown here.
export type ListingCardData = Pick<
  Listing,
  | "id"
  | "title"
  | "sector"
  | "city"
  | "monthly_revenue"
  | "offered_percentage"
  | "asking_price"
  | "price_negotiable"
  | "photo_urls"
  | "verification_status"
  | "verified_at"
  | "miyar_grade"
  | "is_featured"
>;

export const LISTING_CARD_COLUMNS =
  "id, title, sector, city, monthly_revenue, offered_percentage, asking_price, price_negotiable, photo_urls, verification_status, verified_at, miyar_grade, is_featured";

export function VerifiedBadge() {
  const { t } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 6,
        backgroundColor: t.successTint,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.pill,
      }}
    >
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: t.success,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DrawnCheckmark size={8} color={t.successTint} play={false} />
      </View>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: t.success }}>موثّق</Text>
    </View>
  );
}

function statusStyle(t: ThemeTokens, status: ListingStatus) {
  switch (status) {
    case "draft":
      return { bg: t.surface2, fg: t.textMuted };
    case "pending_review":
      return { bg: `${t.primary}1F`, fg: t.primary };
    case "published":
      return { bg: t.successTint, fg: t.success };
    case "rejected":
      return { bg: t.dangerTint, fg: t.danger };
    case "archived":
      return { bg: t.surface2, fg: t.textMuted };
  }
}

export function StatusBadge({ status }: { status: ListingStatus }) {
  const { t } = useTheme();
  const s = statusStyle(t, status);
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: s.fg }}>
        {LISTING_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

function verificationStyle(t: ThemeTokens, status: VerificationStatus) {
  switch (status) {
    case "none":
      return { bg: t.surface2, fg: t.textMuted };
    case "pending":
      return { bg: `${t.primary}1F`, fg: t.primary };
    case "verified":
      return { bg: t.successTint, fg: t.success };
    case "rejected":
      return { bg: t.dangerTint, fg: t.danger };
  }
}

export function VerificationStatusPill({ status }: { status: VerificationStatus }) {
  const { t } = useTheme();
  const s = verificationStyle(t, status);
  return (
    <View
      style={{
        alignSelf: "flex-end",
        backgroundColor: s.bg,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: radius.pill,
      }}
    >
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: s.fg }}>
        {VERIFICATION_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

export function Metric({
  label,
  value,
  amber = false,
}: {
  label: string;
  value: string;
  /** Highlights the value in the brand accent — kept as `amber` so every
   * existing call site (9 screens) works unchanged after the color swap. */
  amber?: boolean;
}) {
  const { t } = useTheme();
  return (
    <View>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, marginBottom: 4, textAlign: "right" }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.numericBold,
          fontSize: 18,
          color: amber ? t.primary : t.text,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function ListingCard({ listing, index = 0 }: { listing: ListingCardData; index?: number }) {
  const router = useRouter();
  const { t } = useTheme();
  const isVerified = listing.verification_status === "verified";

  return (
    <Animated_Entering index={index}>
      <Tappable onPress={() => router.push(`/listings/${listing.id}`)} haptic="light">
        <Card style={{ padding: 20 }}>
          {listing.photo_urls?.[0] ? (
            <Image
              source={{ uri: listing.photo_urls[0] }}
              style={{ width: "100%", height: 140, borderRadius: radius.lg, marginBottom: 14, backgroundColor: t.surface2 }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : null}

          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: t.text, textAlign: "right" }}>
                {listing.title}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, marginTop: 4, textAlign: "right" }}>
                قطاع {SECTOR_LABELS[listing.sector]} · {listing.city}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <MiyarBadge grade={listing.miyar_grade} />
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
            <Metric label="الإيراد الشهري" value={formatSar(listing.monthly_revenue)} />
            <Metric label="النسبة المطروحة" value={formatPercentage(listing.offered_percentage)} amber />
            {listing.asking_price != null ? (
              <Metric
                label={listing.price_negotiable ? "السعر المطلوب (قابل للتفاوض)" : "السعر المطلوب"}
                value={formatSar(listing.asking_price)}
              />
            ) : null}
          </View>

          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>
              {isVerified && listing.verified_at ? `تحقق محاسبي: ${formatDate(listing.verified_at)}` : "بانتظار التوثيق المالي"}
            </Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: t.text }}>التفاصيل ←</Text>
          </View>
        </Card>
      </Tappable>
    </Animated_Entering>
  );
}

// Small wrapper so ListingCard/FranchiseCard get the shared staggered
// entrance without every call site having to import Reanimated itself.
function Animated_Entering({ index, children }: { index: number; children: React.ReactNode }) {
  return <Animated.View entering={staggerEnter(Math.min(index, 8))}>{children}</Animated.View>;
}
