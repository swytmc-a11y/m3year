import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Linking, AppState } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, IconButton, EmptyState, Skeleton, Tappable, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import {
  listPromotionPlans,
  startPromotionCheckout,
  getPromotionOrder,
  verifyPromotionPayment,
  formatHalalas,
  type PromotionPlan,
} from "@/lib/promotions";
import { fonts, radius } from "@/theme";

// Buying a "تمييز" window for one listing or franchise.
//
// Payment happens on the provider's hosted page, opened in the system
// browser — no card field is ever rendered by this app. When the user comes
// back, the order is re-read from the database rather than trusted from the
// browser: the promotion is only real once the payment webhook has confirmed
// it server-side, so this screen reports what the server says, not what the
// return URL claims.
export default function PromoteScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  // Reached as /promote?type=listing&id=... — a flat route with query params
  // rather than nested dynamic segments, since there is exactly one screen
  // here and the type is a two-value discriminator, not a path hierarchy.
  const params = useLocalSearchParams<{ type?: string; id?: string }>();

  const targetType = params.type === "franchise" ? "franchise" : "listing";
  const targetId = String(params.id ?? "");

  const [plans, setPlans] = useState<PromotionPlan[] | null>(null);
  const [title, setTitle] = useState<string>("");
  const [featuredUntil, setFeaturedUntil] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // Two separate queries rather than one with an interpolated column name:
  // supabase-js derives the row type from the literal select string, so a
  // template literal there erases all type safety for the whole result.
  const loadTarget = useCallback(async () => {
    if (!targetId) return;

    if (targetType === "listing") {
      const { data } = await supabase
        .from("listings")
        .select("title, status, featured_until")
        .eq("id", targetId)
        .maybeSingle();
      if (data) {
        setTitle(data.title);
        setStatus(data.status);
        setFeaturedUntil(data.featured_until);
      }
      return;
    }

    const { data } = await supabase
      .from("franchises")
      .select("brand_name, status, featured_until")
      .eq("id", targetId)
      .maybeSingle();
    if (data) {
      setTitle(data.brand_name);
      setStatus(data.status);
      setFeaturedUntil(data.featured_until);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    listPromotionPlans().then(setPlans);
    loadTarget();
  }, [loadTarget]);

  // Coming back from the browser is the moment the result may have changed.
  // The webhook is what actually applies the promotion, so re-read rather
  // than assume — and re-read the target too, since that is what the user
  // is really asking about.
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;
      if (!pendingOrderId) {
        loadTarget();
        return;
      }

      // Ask the server to confirm with the provider first. The simulator
      // settles its own orders, so this is a no-op there; for a real gateway
      // it is what actually turns a completed checkout into a promotion.
      await verifyPromotionPayment(pendingOrderId);
      await loadTarget();

      const order = await getPromotionOrder(pendingOrderId);
      if (!order) return;
      if (order.status === "paid") {
        toast("تم تفعيل التمييز بنجاح.", "success");
        setPendingOrderId(null);
      } else if (order.status === "failed" || order.status === "cancelled") {
        toast("لم تكتمل عملية الدفع.", "error");
        setPendingOrderId(null);
      }
    });
    return () => sub.remove();
  }, [pendingOrderId, loadTarget, toast]);

  const isCurrentlyFeatured = Boolean(featuredUntil && new Date(featuredUntil) > new Date());

  async function onPay() {
    if (!selected) return;
    setSubmitting(true);
    const result = await startPromotionCheckout({ targetType, targetId, planCode: selected });
    setSubmitting(false);

    if (result.error || !result.paymentUrl) {
      toast(result.error ?? "تعذّر بدء عملية الدفع.", "error");
      return;
    }

    setPendingOrderId(result.orderId ?? null);
    const canOpen = await Linking.canOpenURL(result.paymentUrl);
    if (!canOpen) {
      toast("تعذّر فتح صفحة الدفع على هذا الجهاز.", "error");
      return;
    }
    await Linking.openURL(result.paymentUrl);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>تمييز الإعلان</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        {title ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right" }}>
            {title}
          </Text>
        ) : null}

        {isCurrentlyFeatured ? (
          <Card style={{ padding: 16, gap: 6 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.success, textAlign: "right" }}>
              هذا الإعلان مميّز حاليًا
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", lineHeight: 20 }}>
              ينتهي التمييز في {new Date(featuredUntil!).toLocaleDateString("ar-SA")}. يمكنك التجديد بعد انتهاء المدة الحالية.
            </Text>
          </Card>
        ) : status && status !== "published" ? (
          <EmptyState
            title="الإعلان غير منشور"
            description="يمكن تمييز الإعلانات المنشورة فقط. انتظر اعتماد الإعلان ثم عد إلى هنا."
          />
        ) : plans === null ? (
          <View style={{ gap: 12 }}>
            <Skeleton width="100%" height={90} radius={radius.xl} />
            <Skeleton width="100%" height={90} radius={radius.xl} />
          </View>
        ) : plans.length === 0 ? (
          <EmptyState
            title="التمييز غير متاح حاليًا"
            description="سيتم تفعيل خدمة التمييز قريبًا."
          />
        ) : (
          <>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", lineHeight: 21 }}>
              التمييز يرفع إعلانك إلى أعلى نتائج التصفح طوال المدة المختارة. نشر الإعلان مجاني دائمًا — التمييز خدمة إضافية اختيارية.
            </Text>

            {plans.map((plan) => {
              const active = selected === plan.code;
              return (
                <Tappable
                  key={plan.code}
                  onPress={() => setSelected(plan.code)}
                  haptic="light"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${plan.name_ar} — ${formatHalalas(plan.price_halalas)}`}
                >
                  <Card
                    style={{
                      padding: 16,
                      gap: 6,
                      borderWidth: 1.5,
                      borderColor: active ? t.primary : "transparent",
                    }}
                  >
                    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7, flex: 1 }}>
                        <Text style={{ fontFamily: fonts.displayBold, fontSize: 14.5, color: t.text, textAlign: "right" }}>
                          {plan.name_ar}
                        </Text>
                        {/* Unmistakable, so a simulated plan can never be
                            mistaken for a real charge during testing. */}
                        {plan.is_test ? (
                          <View
                            style={{
                              backgroundColor: t.surface2,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: radius.pill,
                            }}
                          >
                            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 10, color: t.textMuted }}>
                              محاكاة
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.primary }}>
                        {formatHalalas(plan.price_halalas)}
                      </Text>
                    </View>
                    {plan.description_ar ? (
                      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted, textAlign: "right", lineHeight: 19 }}>
                        {plan.description_ar}
                      </Text>
                    ) : null}
                  </Card>
                </Tappable>
              );
            })}

            <Button
              label="المتابعة للدفع"
              fullWidth
              disabled={!selected}
              loading={submitting}
              onPress={onPay}
            />

            <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted, textAlign: "center", lineHeight: 18 }}>
              تتم عملية الدفع عبر بوابة دفع آمنة خارج التطبيق. لا يحتفظ تطبيق معيار ببيانات بطاقتك.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
