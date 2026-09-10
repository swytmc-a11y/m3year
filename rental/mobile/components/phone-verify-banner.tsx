import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { Button, Tappable } from "@/components/kit";
import { CloseIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";

/**
 * The home screen's first-thing-you-see nudge for an account that signed up
 * by email and never verified a phone — the wallet's 50 SAR welcome credit
 * requires one (see activate_signup_credit), and this is the "come get it"
 * counterpart to the modal /auth and /verify-phone show the instant a phone
 * actually gets verified. Same dark-canvas + lime "giant number" language as
 * WalletBonusModal and the home feed's promo cards, so it reads as the same
 * brand event rather than a generic banner ad.
 *
 * Dismissing is per-session (a plain piece of state the caller owns) — the
 * reward is still unclaimed, so it comes back next launch rather than being
 * gone for good over one tap.
 */
export function PhoneVerifyBanner({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTheme();
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.duration(320)} exiting={FadeOutUp.duration(200)}>
      <View
        style={{
          backgroundColor: t.canvas,
          borderRadius: radius.xxl,
          padding: 18,
          paddingTop: 16,
          overflow: "hidden",
          gap: 12,
          ...t.shadowSm,
        }}
      >
        <Text
          accessible={false}
          style={{
            position: "absolute",
            left: -10,
            bottom: -30,
            fontFamily: fonts.displayBold,
            fontSize: 108,
            color: `${t.onCanvas}12`,
          }}
        >
          ٥٠
        </Text>

        <View style={{ flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 16, color: t.onCanvas, textAlign: "right" }}>
              وثّق رقم جوالك واحصل على ٥٠ ريال
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 12.5,
                color: t.onCanvasMuted,
                textAlign: "right",
                lineHeight: 19,
              }}
            >
              يُضاف رصيد ترحيبي لمحفظتك فور توثيق رقمك عبر واتساب.
            </Text>
          </View>
          <Tappable onPress={onDismiss} haptic="light" accessibilityRole="button" accessibilityLabel="إغلاق">
            <View style={{ padding: 2 }}>
              <CloseIcon color={t.onCanvasMuted} size={16} />
            </View>
          </Tappable>
        </View>

        <Button
          label="اربح ٥٠ ريال"
          variant="accent"
          onPress={() => router.push({ pathname: "/verify-phone", params: { next: "/" } })}
        />
      </View>
    </Animated.View>
  );
}
