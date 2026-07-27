import { useEffect, useState } from "react";
import { I18nManager, Platform, View } from "react-native";
import { Stack, router } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import { AppSplash } from "@/components/app-splash";
import { ErrorBoundary } from "@/components/error-boundary";
import { ToastProvider } from "@/components/kit";
import {
  Almarai_700Bold,
  Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from "@expo-google-fonts/ibm-plex-mono";
import {
  Alexandria_600SemiBold,
  Alexandria_700Bold,
} from "@expo-google-fonts/alexandria";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { AuthProvider } from "@/contexts/auth";
import { ThemeProvider, useTheme } from "@/contexts/theme";

// Arabic is a right-to-left language; force RTL layout app-wide.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Almarai_700Bold,
    Almarai_800ExtraBold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    Alexandria_600SemiBold,
    Alexandria_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Tapping a "new message" push notification opens that conversation
  // directly, whether the app was backgrounded or launched cold by the tap.
  // expo-notifications' response APIs are native-only (no web support).
  useEffect(() => {
    if (Platform.OS === "web") return;

    function handleResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as
        | { type?: string; conversationId?: string }
        | undefined;
      if (data?.type === "message" && data.conversationId) {
        router.push(`/messages/${data.conversationId}`);
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <RootChrome splashDone={splashDone} onSplashDone={() => setSplashDone(true)} />
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Split out so it can read the theme via context (a provider's own body
// can't consume the context it renders).
function RootChrome({
  splashDone,
  onSplashDone,
}: {
  splashDone: boolean;
  onSplashDone: () => void;
}) {
  const { isDark, t } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.bg },
            animation: "slide_from_left",
          }}
        />
        {!splashDone ? <AppSplash onDone={onSplashDone} /> : null}
      </View>
    </>
  );
}
