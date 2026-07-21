import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests permission, obtains an Expo push token, and upserts it for the
 * signed-in user. Safe to call every app start / sign-in — it's idempotent
 * (unique on user_id + token).
 *
 * Requires the app to be linked to an EAS project (`eas init`) so a
 * projectId is available; on Expo Go without EAS linkage this silently
 * no-ops rather than throwing, since push simply won't be available yet.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    return; // Simulators/emulators cannot receive push notifications.
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn(
      "[push] no EAS projectId configured — run `eas init` to enable push notifications",
    );
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#0F6B66",
    });
  }

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: user.id,
      expo_push_token: expoPushToken,
      platform: Platform.OS === "ios" ? "ios" : "android",
    },
    { onConflict: "user_id,expo_push_token" },
  );
  if (error) {
    console.error("[push] failed to save push token", error);
  }
}

/** Best-effort removal of this device's token on sign-out. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId || !Device.isDevice) return;

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    await supabase.from("push_tokens").delete().eq("expo_push_token", expoPushToken);
  } catch {
    // Best-effort only — never block sign-out on this.
  }
}
