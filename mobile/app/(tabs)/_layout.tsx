import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/floating-tab-bar";

export default function TabsLayout() {
  return (
    <Tabs
      // Floating pill nav (new identity) replaces the bordered bottom strip
      // entirely, so the default bar chrome (colors/height/border) no
      // longer applies — FloatingTabBar owns its own look.
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: "shift",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية" }} />
      <Tabs.Screen name="messages/index" options={{ title: "المحادثات" }} />
      <Tabs.Screen name="profile/index" options={{ title: "الملف الشخصي" }} />
    </Tabs>
  );
}
