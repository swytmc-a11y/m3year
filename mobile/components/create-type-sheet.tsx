import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Sheet, Tappable } from "@/components/kit";
import { ChevronBackIcon, OpportunityIcon, StorefrontIcon } from "@/components/icons";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";

/**
 * The single entry point for creating anything. Both kinds of ad are "an ad",
 * so the user picks the kind here instead of the app scattering separate
 * "إعلان جديد" / "امتياز جديد" buttons across screens.
 */
export function CreateTypeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();

  function go(href: "/my-listings/new" | "/my-franchises/new") {
    onClose();
    router.push(href);
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="حدد نوع الإعلان">
      <View style={{ gap: 10, paddingBottom: 6 }}>
        <TypeOption
          icon={<OpportunityIcon color="#fff" size={20} />}
          title="فرصة استثمارية"
          description="مشروع قائم يبحث عن شريك مموّل — تعرض إيراده والنسبة المطروحة."
          onPress={() => go("/my-listings/new")}
        />
        <TypeOption
          icon={<StorefrontIcon color="#fff" size={20} />}
          title="امتياز تجاري"
          description="علامة تجارية تتوسّع عبر امتيازات — تعرض رسومها ومتطلبات التشغيل."
          onPress={() => go("/my-franchises/new")}
        />
      </View>
    </Sheet>
  );
}

function TypeOption({
  icon,
  title,
  description,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Tappable onPress={onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={title}>
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          gap: 13,
          backgroundColor: t.surface,
          borderRadius: radius.xl,
          padding: 15,
          ...t.shadowSm,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.lg,
            backgroundColor: t.primary,
            alignItems: "center",
            justifyContent: "center",
            ...t.shadowPrimary,
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 13.5, color: t.text, textAlign: "right" }}>
            {title}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 18 }}>
            {description}
          </Text>
        </View>
        <ChevronBackIcon color={t.textMuted} size={14} />
      </View>
    </Tappable>
  );
}
