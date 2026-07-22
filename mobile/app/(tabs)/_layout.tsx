import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeIcon, ChatIcon, ProfileIcon, ActiveDot } from "@/components/icons";
import { colors, fonts } from "@/theme";

import type { ColorValue } from "react-native";

type IconRenderer = (props: { focused: boolean; color: ColorValue; size: number }) => React.ReactNode;

const TAB_ICONS: Record<string, IconRenderer> = {
  index: (p) => <HomeIcon {...p} />,
  "messages/index": (p) => <ChatIcon {...p} />,
  "profile/index": (p) => <ProfileIcon {...p} />,
};

const TAB_TITLES: Record<string, string> = {
  index: "الرئيسية",
  "messages/index": "المحادثات",
  "profile/index": "الملف الشخصي",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        // Smooth, consistent transition when switching tabs.
        animation: "shift",
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.grid,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          // Soft lift so the bar reads as its own surface above the content.
          shadowColor: colors.ink,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarIcon: ({ focused, color }) => (
          <View style={{ alignItems: "center", justifyContent: "center", height: 26 }}>
            {TAB_ICONS[route.name]?.({ focused, color, size: 24 })}
          </View>
        ),
        tabBarLabel: ({ focused, color }) => (
          <View style={{ alignItems: "center", gap: 3, marginTop: 2 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium,
                fontSize: 11,
                color,
              }}
            >
              {TAB_TITLES[route.name]}
            </Text>
            <View style={{ height: 4, justifyContent: "center" }}>
              {focused ? <ActiveDot /> : null}
            </View>
          </View>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="messages/index" options={{ title: "المحادثات" }} />
      <Tabs.Screen name="profile/index" options={{ title: "الملف الشخصي" }} />
    </Tabs>
  );
}
