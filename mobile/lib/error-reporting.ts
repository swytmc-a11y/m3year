import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

// Bounded so a runaway error loop cannot spam the database (or burn the
// project's request quota) with thousands of copies of the same crash.
const MAX_REPORTS_PER_SESSION = 10;
const MESSAGE_LIMIT = 500;
const STACK_LIMIT = 2000;

let reportsThisSession = 0;
const seen = new Set<string>();

/**
 * Records a client-side error so it is visible in production.
 *
 * Everything about this is best-effort and non-blocking: reporting a crash
 * must never itself throw, never block the UI, and never turn a recoverable
 * error into a worse one. A failure to report is swallowed on purpose — there
 * is nowhere better to send it.
 */
export async function reportError(
  error: unknown,
  context?: string,
): Promise<void> {
  try {
    if (reportsThisSession >= MAX_REPORTS_PER_SESSION) return;

    const err = error instanceof Error ? error : new Error(String(error));
    const message = (err.message || "unknown error").slice(0, MESSAGE_LIMIT);
    const stack = err.stack ? err.stack.slice(0, STACK_LIMIT) : null;

    // The same error firing on every render should be recorded once, not
    // once per frame.
    const fingerprint = `${context ?? ""}:${message}`;
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    reportsThisSession += 1;

    const { data } = await supabase.auth.getSession();

    await supabase.from("client_errors").insert({
      user_id: data.session?.user.id ?? null,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? null,
      message,
      stack,
      context: context ?? null,
    });
  } catch {
    // Intentionally silent: see above.
  }
}

/**
 * Records a problem the user described themselves, from the Settings
 * screen — same table and admin view as automatic crash reports, tagged
 * "user_report" so the two are distinguishable there. Unlike reportError,
 * this one surfaces its own failure back to the caller: it's the one path
 * where the user is actively waiting on confirmation their report went out.
 */
export async function reportUserFeedback(message: string): Promise<{ error?: string }> {
  const trimmed = message.trim().slice(0, MESSAGE_LIMIT);
  if (!trimmed) return { error: "اكتب وصفًا للمشكلة أولًا." };

  try {
    const { data } = await supabase.auth.getSession();

    const { error } = await supabase.from("client_errors").insert({
      user_id: data.session?.user.id ?? null,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? null,
      message: trimmed,
      context: "user_report",
    });

    if (error) return { error: "تعذّر إرسال البلاغ الآن. حاول مرة أخرى." };
    return {};
  } catch {
    return { error: "تعذّر إرسال البلاغ الآن. حاول مرة أخرى." };
  }
}
