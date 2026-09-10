import { useEffect, useRef, useState } from "react";
import { I18nManager, Platform, View } from "react-native";
import { Stack, router } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import { AppSplash } from "@/components/app-splash";
import { Onboarding } from "@/components/onboarding";
import { ErrorBoundary } from "@/components/error-boundary";
import { ToastProvider } from "@/components/kit";
import { WalletBonusModal } from "@/components/wallet-bonus-modal";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/onboarding";
import { activateSignupCredit } from "@/lib/referrals";
import { takeReferralCode } from "@/lib/referral-link";
import { supabase } from "@/lib/supabase";
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
import { AuthProvider, useAuth } from "@/contexts/auth";
import { ThemeProvider, useTheme } from "@/contexts/theme";

// Arabic is a right-to-left language; force RTL layout app-wide.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);
  // null = still reading storage, so the intro never flashes for a returning
  // user while the answer is in flight.
  const [showIntro, setShowIntro] = useState<boolean | null>(null);
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

  useEffect(() => {
    hasSeenOnboarding().then((seen) => setShowIntro(!seen));
  }, []);

  // Tapping a push notification opens what it is about, whether the app was
  // backgrounded or launched cold by the tap.
  //
  // The payload shape here mirrors what the server actually writes on a
  // notification row (see the web project's booking actions): a booking id,
  // plus an "action" when the booking wants something back from the
  // customer. This previously looked for a "message" type with a
  // conversation id — carried over from the real-estate app this one was
  // scaffolded from — so no rental notification could ever match it, and
  // every tap did nothing.
  //
  // expo-notifications' response APIs are native-only (no web support).
  useEffect(() => {
    if (Platform.OS === "web") return;

    function handleResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as
        | { booking_id?: string; car_id?: string; action?: string }
        | undefined;
      if (!data) return;

      if (data.action === "review" && data.booking_id) {
        router.push(`/review/${data.booking_id}`);
      } else if (data.booking_id) {
        router.push(`/bookings/${data.booking_id}`);
      } else if (data.car_id) {
        router.push(`/cars/${data.car_id}`);
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
                <RootChrome
                  splashDone={splashDone}
                  onSplashDone={() => setSplashDone(true)}
                  showIntro={splashDone && showIntro === true}
                  onIntroDone={() => {
                    setShowIntro(false);
                    markOnboardingSeen();
                  }}
                />
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
  showIntro,
  onIntroDone,
}: {
  splashDone: boolean;
  onSplashDone: () => void;
  showIntro: boolean;
  onIntroDone: () => void;
}) {
  const { isDark, t } = useTheme();
  const { bonusAmount, clearBonus } = useSignupCredit();
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
        {/* Order matters: the intro sits under the splash so the handoff is a
            single fade rather than two overlays fighting. */}
        {showIntro ? <Onboarding onDone={onIntroDone} /> : null}
        {!splashDone ? <AppSplash onDone={onSplashDone} /> : null}
        {/* Catches the passive case: an account whose phone was already
            verified (a returning WhatsApp login, or one linked from
            /verify-phone in an earlier session) but never actually claimed
            its welcome credit — the explicit screens show their own copy of
            this modal the instant they grant it, so this one only fires
            when nothing else already did. */}
        {bonusAmount != null ? (
          <WalletBonusModal visible amount={bonusAmount} onClose={clearBonus} />
        ) : null}
      </View>
    </>
  );
}

/**
 * Claims the welcome credit, and the referral if the app was opened through
 * an invite link, once there is an account to credit.
 *
 * Runs on every launch rather than only on the first: the server grants the
 * welcome credit at most once per account and records a referral at most
 * once per referred user, so this is a cheap no-op afterwards — and it also
 * means customers who already had an account get their credit without a
 * migration.
 *
 * Two follow-ups depending on what the server reports:
 *   - welcome > 0: the account just genuinely earned the credit right now
 *     (e.g. a returning WhatsApp login whose phone was verified before this
 *     feature existed). /auth and /verify-phone already show their own copy
 *     of this modal the instant THEY grant it, so this only actually fires
 *     for whatever neither of those caught.
 *   - reason "phone_required": eligible but missing a phone. Seeds the
 *     one-time in-app nudge — a silent no-op on every call after the first.
 */
function useSignupCredit() {
  const { session } = useAuth();
  const claimed = useRef(false);
  const [bonusAmount, setBonusAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!session || claimed.current) return;
    claimed.current = true;
    (async () => {
      const code = await takeReferralCode();
      const credit = await activateSignupCredit(code);
      if (!credit) return;

      if (credit.welcome > 0) {
        setBonusAmount(credit.welcome);
      } else if (credit.reason === "phone_required") {
        const { error } = await supabase.rpc("maybe_nudge_phone_verification", {});
        if (error) console.error("[wallet] nudge seed failed", error);
      }
    })();
  }, [session]);

  return { bonusAmount, clearBonus: () => setBonusAmount(null) };
}
