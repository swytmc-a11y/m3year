import { View, Text, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { Caliper } from "@/components/caliper";
import { colors, fonts, radius } from "@/theme";
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

export function VerifiedBadge() {
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(15,107,102,0.1)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.pill,
      }}
    >
      <Caliper color={colors.verify} size={12} />
      <Text
        style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.verify }}
      >
        موثّق
      </Text>
    </View>
  );
}

const STATUS_STYLE: Record<ListingStatus, { bg: string; fg: string }> = {
  draft: { bg: colors.paper, fg: colors.subtleText },
  pending_review: { bg: "rgba(217,118,43,0.12)", fg: colors.amber },
  published: { bg: "rgba(15,107,102,0.1)", fg: colors.verify },
  rejected: { bg: colors.dangerBg, fg: colors.danger },
  archived: { bg: "rgba(199,203,198,0.4)", fg: colors.mutedText },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View
      style={{
        backgroundColor: s.bg,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: radius.pill,
      }}
    >
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: s.fg }}>
        {LISTING_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const VERIFICATION_STYLE: Record<VerificationStatus, { bg: string; fg: string }> = {
  none: { bg: colors.paper, fg: colors.subtleText },
  pending: { bg: "rgba(217,118,43,0.12)", fg: colors.amber },
  verified: { bg: "rgba(15,107,102,0.1)", fg: colors.verify },
  rejected: { bg: colors.dangerBg, fg: colors.danger },
};

export function VerificationStatusPill({ status }: { status: VerificationStatus }) {
  const s = VERIFICATION_STYLE[status];
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
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: s.fg }}>
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
  amber?: boolean;
}) {
  return (
    <View>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 12,
          color: colors.mutedText,
          marginBottom: 4,
          textAlign: "right",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: fonts.monoSemiBold,
          fontSize: 18,
          color: amber ? colors.amber : colors.ink,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const isVerified = listing.verification_status === "verified";

  return (
    <Pressable
      onPress={() => router.push(`/listings/${listing.id}`)}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderColor: colors.grid,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: 20,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {listing.photo_urls?.[0] ? (
        <Image
          source={{ uri: listing.photo_urls[0] }}
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
            {listing.title}
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
            قطاع {SECTOR_LABELS[listing.sector]} · {listing.city}
          </Text>
        </View>
        {isVerified ? <VerifiedBadge /> : null}
      </View>

      <View
        style={{
          flexDirection: "row-reverse",
          gap: 32,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.grid,
          borderStyle: "dashed",
          paddingVertical: 14,
          marginBottom: 14,
        }}
      >
        <Metric label="الإيراد الشهري" value={formatSar(listing.monthly_revenue)} />
        <Metric
          label="النسبة المطروحة"
          value={formatPercentage(listing.offered_percentage)}
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
        <Text
          style={{ fontFamily: fonts.body, fontSize: 12, color: colors.mutedText }}
        >
          {isVerified && listing.verified_at
            ? `تحقق محاسبي: ${formatDate(listing.verified_at)}`
            : "بانتظار التوثيق المالي"}
        </Text>
        <Text
          style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink }}
        >
          التفاصيل ←
        </Text>
      </View>
    </Pressable>
  );
}
