import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Whether the first-run introduction has been shown.
 *
 * Deliberately device-local rather than a column on the profile: it is a
 * property of "has this person seen the app before", and it must work before
 * sign-in — the intro is what explains the marketplace to someone deciding
 * whether to create an account at all.
 *
 * The key is versioned so a materially different intro can be shown again
 * later without clashing with an old "seen" flag.
 */
const KEY = "smo.onboarding.seen.v1";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch (err) {
    // A storage failure must never wedge the app behind the intro; showing it
    // one extra time is the harmless direction to fail in.
    console.error("[onboarding] read failed", err);
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "1");
  } catch (err) {
    console.error("[onboarding] write failed", err);
  }
}
