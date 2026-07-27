import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Config resolution order:
//   1. process.env.EXPO_PUBLIC_* — inlined by babel-preset-expo at bundle time.
//   2. app.json `extra` — embedded into the native app at prebuild time and
//      read back through expo-constants at runtime.
// (1) silently yields `undefined` if the value wasn't present when Metro
// transformed this file (e.g. a stale transform cache), which used to make
// createClient throw AT MODULE LOAD — an unhandled JS error that hard-aborts
// a release build before React can render anything. (2) is an independent
// path that does not depend on the bundler, and the placeholders below
// guarantee this module can never throw on import.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || "";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "";

/** Non-null when the app was built without usable Supabase credentials. */
export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? "لم يتم تهيئة الاتصال بالخادم في هذه النسخة من التطبيق."
    : null;

if (supabaseConfigError) {
  console.error("[supabase] missing configuration", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
}

export const supabase = createClient<Database>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      // Persist the session in device storage. On web (Expo web preview) fall
      // back to the default storage so SSR/localStorage works.
      storage: Platform.OS === "web" ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Keep the auth token fresh only while the app is in the foreground.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
