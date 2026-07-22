import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors, fonts } from "@/theme";

const TAB_GLYPHS: Record<string, string> = {
  index: "⌂",
  "messages/index": "✉",
  "profile/index": "◔",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.grid,
          height: 58,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 12,
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_GLYPHS[route.name] ?? "•"}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="messages/index" options={{ title: "المحادثات" }} />
      <Tabs.Screen name="profile/index" options={{ title: "الملف الشخصي" }} />
    </Tabs>
  );
}
