import { View, Text, ScrollView } from "react-native";
import { Tappable } from "@/components/kit";
import { ArrowLeftIcon, CalendarIcon, PinIcon, SearchIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";
import { formatDateShort } from "@/lib/constants";
import { daysBetween } from "@/lib/dates";

/**
 * The hero: a dark canvas carrying the headline and the search widget.
 *
 * The widget sits inside it rather than below it because renting a car is a
 * question of where and when before it is a question of which — putting the
 * answer to that first is what turns a catalogue into a booking flow.
 */
export function Hero({
  title,
  subtitle,
  branchName,
  dates,
  onPickBranch,
  onPickDates,
  onSearch,
}: {
  title: string;
  subtitle: string;
  branchName: string | null;
  dates: { start: string; end: string } | null;
  onPickBranch: () => void;
  onPickDates: () => void;
  onSearch: () => void;
}) {
  const { t } = useTheme();

  return (
    <View
      style={{
        backgroundColor: t.canvas,
        borderRadius: radius.xxl,
        padding: 20,
        gap: 18,
        overflow: "hidden",
      }}
    >
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontFamily: fonts.displayBold,
            fontSize: 25,
            lineHeight: 36,
            color: t.onCanvas,
            textAlign: "right",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 13,
            lineHeight: 22,
            color: t.onCanvasMuted,
            textAlign: "right",
          }}
        >
          {subtitle}
        </Text>
      </View>

      <View style={{ backgroundColor: t.surface, borderRadius: radius.xl, padding: 12, gap: 10 }}>
        <SearchField
          icon={<PinIcon color={t.textMuted} size={15} />}
          label="موقع الاستلام"
          value={branchName ?? "كل الفروع"}
          onPress={onPickBranch}
        />

        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SearchField
              icon={<CalendarIcon color={t.textMuted} size={15} />}
              label="تاريخ الاستلام"
              value={dates ? formatDateShort(dates.start) : "اختر"}
              onPress={onPickDates}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SearchField
              icon={<CalendarIcon color={t.textMuted} size={15} />}
              label="تاريخ التسليم"
              value={dates ? formatDateShort(dates.end) : "اختر"}
              onPress={onPickDates}
            />
          </View>
        </View>

        {dates ? (
          <Text
            style={{
              fontFamily: fonts.numericBold,
              fontSize: 11.5,
              color: t.textMuted,
              textAlign: "right",
            }}
          >
            {daysBetween(dates.start, dates.end)} أيام
          </Text>
        ) : null}

        <Tappable onPress={onSearch} haptic="medium" accessibilityRole="button">
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: t.accent,
              borderRadius: radius.lg,
              paddingVertical: 13,
            }}
          >
            <SearchIcon color={t.onAccent} size={15} />
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.onAccent }}>
              ابحث الآن
            </Text>
          </View>
        </Tappable>
      </View>
    </View>
  );
}

function SearchField({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Tappable onPress={onPress} haptic="light" accessibilityRole="button" accessibilityLabel={label}>
      <View
        style={{
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 9,
          gap: 3,
        }}
      >
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
          {icon}
          <Text style={{ fontFamily: fonts.body, fontSize: 10.5, color: t.textMuted }}>{label}</Text>
        </View>
        <Text
          numberOfLines={1}
          style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text, textAlign: "right" }}
        >
          {value}
        </Text>
      </View>
    </Tappable>
  );
}

/** Section heading with an optional "see all" on the opposite side. */
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string | null;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { t } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{ fontFamily: fonts.displayBold, fontSize: 17, color: t.text, textAlign: "right" }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "right" }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <Tappable onPress={onAction} haptic="light" accessibilityRole="button">
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingTop: 2 }}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: t.text }}>
              {actionLabel}
            </Text>
            <ArrowLeftIcon color={t.text} size={13} />
          </View>
        </Tappable>
      ) : null}
    </View>
  );
}

export type FeedBanner = {
  id: string;
  render: "image" | "template";
  template: "giant_number" | "discount" | "category" | null;
  tone: string;
  figure: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  image_url: string | null;
  target_kind: string;
  target_car_id: string | null;
  target_branch_id: string | null;
  target_category: string | null;
  target_coupon_code: string | null;
  target_url: string | null;
};

/**
 * A templated promo. The oversized figure is the whole design: it fills the
 * card with brand colour and carries the offer at a glance, which an image
 * would need a designer to achieve and a download to display.
 */
export function PromoCard({
  banner,
  width,
  onPress,
}: {
  banner: FeedBanner;
  width: number;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const lime = banner.tone === "lime";

  const bg = lime ? t.accentTint : t.canvas;
  const fg = lime ? t.text : t.onCanvas;
  const muted = lime ? t.textMuted : t.onCanvasMuted;
  // On the pale card the figure is the saturated accent; on the dark one a
  // saturated numeral would out-shout the headline, so it recedes instead.
  const figureColor = lime ? t.accent : `${t.onCanvas}1A`;

  return (
    <Tappable onPress={onPress} haptic="light" accessibilityRole="button">
      <View
        style={{
          width,
          minHeight: 148,
          backgroundColor: bg,
          borderRadius: radius.xxl,
          padding: 18,
          overflow: "hidden",
          justifyContent: "center",
        }}
      >
        {banner.figure ? (
          <Text
            accessible={false}
            style={{
              position: "absolute",
              left: 6,
              bottom: -22,
              fontFamily: fonts.displayBold,
              fontSize: 104,
              lineHeight: 116,
              color: figureColor,
            }}
          >
            {banner.figure}
          </Text>
        ) : null}

        <View style={{ gap: 5 }}>
          {banner.title ? (
            <Text
              style={{
                fontFamily: fonts.displayBold,
                fontSize: 18,
                lineHeight: 27,
                color: fg,
                textAlign: "right",
              }}
            >
              {banner.title}
            </Text>
          ) : null}
          {banner.subtitle ? (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                lineHeight: 20,
                color: muted,
                textAlign: "right",
              }}
            >
              {banner.subtitle}
            </Text>
          ) : null}
          {banner.cta_label ? (
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
              }}
            >
              <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: fg }}>
                {banner.cta_label}
              </Text>
              <ArrowLeftIcon color={fg} size={14} />
            </View>
          ) : null}
        </View>
      </View>
    </Tappable>
  );
}

/**
 * A horizontal rail of cards. Kept here so every section on the home screen
 * scrolls with the same rhythm and edge padding.
 */
export function Rail({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, gap }}
    >
      {children}
    </ScrollView>
  );
}
