import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeIcon, ListIcon, StorefrontIcon, ProfileIcon } from "@/components/icons";
import { Tappable } from "@/components/kit";
import { useTheme } from "@/contexts/theme";
import { fonts, radius } from "@/theme";

// Expo Router v57 vendors its own copy of react-navigation's bottom-tabs
// types internally rather than exposing `@react-navigation/bottom-tabs` as a
// resolvable package — so this is a minimal local shape covering only what
// this component actually reads/calls, instead of a fragile deep import
// into expo-router's internals.
type MinimalTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (args: { type: "tabPress"; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

const ICONS: Record<string, typeof HomeIcon> = {
  index: HomeIcon,
  "bookings/index": ListIcon,
  "branches/index": StorefrontIcon,
  "profile/index": ProfileIcon,
};

const LABELS: Record<string, string> = {
  index: "الرئيسية",
  "bookings/index": "حجوزاتي",
  "branches/index": "الفروع",
  "profile/index": "حسابي",
};

/**
 * Floating pill tab bar (new identity): a rounded surface hovering above the
 * content instead of a bordered strip pinned to the bottom edge. Only the
 * active tab shows its label — matches the reference design directly.
 */
export function FloatingTabBar({ state, navigation }: MinimalTabBarProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: "absolute",
        bottom: 14 + insets.bottom,
        left: 0,
        right: 0,
        alignItems: "center",
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          flexDirection: "row",
          gap: 4,
          backgroundColor: t.surface,
          borderRadius: radius.pill,
          padding: 6,
          ...t.shadowLg,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = ICONS[route.name];
          const label = LABELS[route.name];
          if (!Icon) return null;

          return (
            <Tappable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              haptic="light"
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 44,
                  paddingHorizontal: focused ? 16 : 14,
                  borderRadius: radius.pill,
                  backgroundColor: focused ? `${t.primary}1A` : "transparent",
                }}
              >
                <Icon
                  focused={focused}
                  color={focused ? t.primary : t.textMuted}
                  activeFill={`${t.primary}24`}
                  size={17}
                />
                {focused ? (
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 11.5, color: t.primary }}>
                    {label}
                  </Text>
                ) : null}
              </View>
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}
