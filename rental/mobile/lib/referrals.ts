import { supabase } from "@/lib/supabase";

export type ReferralSummary = {
  code: string;
  invited: number;
  earned: number;
  referrer_bonus: number;
  welcome_bonus: number;
  enabled: boolean;
};

export type ActivationResult = {
  welcome: number;
  referred: boolean;
  reason: string | null;
  balance: number;
};

/**
 * Called once per signed-in account on first run, with the code from the
 * invite link if the app was opened through one.
 *
 * Safe to call every launch: the server grants the welcome credit at most
 * once per account and records a referral at most once per referred user, so
 * a repeat call reports zero rather than paying again.
 */
export async function activateSignupCredit(
  code?: string | null,
): Promise<ActivationResult | null> {
  const { data, error } = await supabase.rpc("activate_signup_credit", {
    p_code: code ?? null,
  });
  if (error) {
    console.error("[referrals] activate failed", error);
    return null;
  }
  return data as unknown as ActivationResult;
}

export async function fetchReferralSummary(): Promise<ReferralSummary | null> {
  const { data, error } = await supabase.rpc("my_referral_summary", {});
  if (error) {
    console.error("[referrals] summary failed", error);
    return null;
  }
  const s = data as unknown as ReferralSummary;
  return {
    ...s,
    earned: Number(s.earned),
    referrer_bonus: Number(s.referrer_bonus),
    welcome_bonus: Number(s.welcome_bonus),
  };
}

/** The link that carries a referral code into a fresh install. */
export function referralLink(code: string): string {
  return `https://smo-rental.vercel.app/invite/${code}`;
}
