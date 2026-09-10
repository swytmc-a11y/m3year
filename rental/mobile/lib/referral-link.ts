import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sumu.pendingReferralCode";

/**
 * An invite link is usually opened BEFORE there is an account to credit —
 * someone taps a friend's link, installs, then signs up. The code is parked
 * here in the meantime and spent on the first activation after sign-in.
 */
export async function rememberReferralCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, code.trim().toUpperCase());
  } catch (err) {
    console.error("[referral] could not store code", err);
  }
}

export async function takeReferralCode(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(KEY);
    // Read once: a code that stays put would be retried on every launch
    // forever, and the server has already recorded the outcome.
    if (code) await AsyncStorage.removeItem(KEY);
    return code;
  } catch {
    return null;
  }
}

/** `sumu://invite/ABC123` or `https://…/invite/ABC123` → `ABC123`. */
export function parseReferralCode(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/invite\/([A-Za-z0-9]{4,12})/);
  return match ? match[1].toUpperCase() : null;
}
