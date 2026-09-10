import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Animated, { ZoomIn, FadeIn } from "react-native-reanimated";
import { Button, Tappable } from "@/components/kit";
import { useTheme } from "@/contexts/theme";
import { formatSar } from "@/lib/constants";
import { fonts, radius } from "@/theme";

/**
 * The moment a phone gets verified and the wallet actually gains money is
 * worth more than a toast — it is the first real proof the loyalty program
 * is not just marketing copy. Reuses the same dark-canvas + lime-accent
 * "giant number" language already established for the wallet balance and
 * promo banners, so this reads as the same brand event rather than a
 * generic system alert.
 *
 * Deliberately its own centered dialog rather than the bottom Sheet used
 * elsewhere: a sheet is where you go to do something (filter, confirm); this
 * is an announcement, and a sheet sliding up under a "you already have more
 * important things to do" habit reads weaker than something that appears
 * right where the eye already is.
 */
export function WalletBonusModal({
  visible,
  amount,
  onClose,
}: {
  visible: boolean;
  /** Total credited by this event — welcome bonus, referral bonus, or both. */
  amount: number;
  onClose: () => void;
}) {
  const { t } = useTheme();
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]}
        >
          <Pressable accessibilityLabel="إغلاق" onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.springify().damping(16).mass(0.6)}
          style={{
            width: "100%",
            maxWidth: 360,
            backgroundColor: t.canvas,
            borderRadius: radius.xxl,
            padding: 28,
            alignItems: "center",
            gap: 14,
            ...t.shadowLg,
          }}
        >
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.onCanvasMuted, textAlign: "center" }}>
            وُثّق رقم جوالك بنجاح
          </Text>

          <View
            style={{
              backgroundColor: t.accent,
              borderRadius: radius.pill,
              paddingHorizontal: 20,
              paddingVertical: 10,
              marginVertical: 4,
            }}
          >
            <Text style={{ fontFamily: fonts.numericBold, fontSize: 30, color: t.onAccent }}>
              +{formatSar(amount)}
            </Text>
          </View>

          <Text style={{ fontFamily: fonts.displayBold, fontSize: 17, color: t.onCanvas, textAlign: "center" }}>
            أُضيف إلى محفظتك
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12.5,
              color: t.onCanvasMuted,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            يُصرف تلقائيًا عند اختيارك له في صفحة الحجز القادمة.
          </Text>

          <View style={{ width: "100%", marginTop: 8 }}>
            <Button
              label="عرض محفظتي"
              variant="accent"
              fullWidth
              onPress={() => {
                onClose();
                router.push("/wallet");
              }}
            />
          </View>

          {/* A bordered "secondary" Button reads as t.border/t.text, both
              tuned for a light surface — invisible on this dark canvas. A
              plain text link matches how the rest of this card is styled
              directly against t.onCanvas instead. */}
          <Tappable onPress={onClose} haptic="light" accessibilityRole="button">
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.onCanvasMuted, paddingVertical: 4 }}>
              متابعة
            </Text>
          </Tappable>
        </Animated.View>
      </View>
    </Modal>
  );
}
