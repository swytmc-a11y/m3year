import { supabase } from "@/lib/supabase";

export type PromotionPlan = {
  code: string;
  name_ar: string;
  description_ar: string | null;
  duration_days: number;
  price_halalas: number;
};

export type PromotionOrder = {
  id: string;
  target_type: "listing" | "franchise";
  target_id: string;
  plan_code: string;
  amount_halalas: number;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  featured_until: string | null;
  created_at: string;
};

/**
 * Prices are stored in halalas (integer) so no rounding drift creeps in
 * between us and the payment provider, which also bills in halalas.
 */
export function formatHalalas(halalas: number): string {
  const riyals = halalas / 100;
  const text = Number.isInteger(riyals) ? String(riyals) : riyals.toFixed(2);
  return `${text} ر.س`;
}

export async function listPromotionPlans(): Promise<PromotionPlan[]> {
  const { data, error } = await supabase
    .from("promotion_plans")
    .select("code, name_ar, description_ar, duration_days, price_halalas")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[promotions] plans load failed", error);
    return [];
  }
  return data ?? [];
}

/**
 * Asks the server to open a paid promotion. The price is deliberately not a
 * parameter — the server reads it from the plan, so nothing the app sends can
 * change what is charged.
 *
 * Returns the hosted payment page URL for the caller to open; payment itself
 * happens on the provider's page, never inside the app, so no card data ever
 * passes through here.
 */
export async function startPromotionCheckout(params: {
  targetType: "listing" | "franchise";
  targetId: string;
  planCode: string;
}): Promise<{ paymentUrl?: string; orderId?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("create-promotion-payment", {
    body: params,
  });

  if (error) {
    console.error("[promotions] checkout failed", error);
    // The function returns a JSON body with a readable Arabic message even on
    // 4xx/5xx; supabase-js hides it behind a generic error, so surface what we
    // can and fall back to something honest.
    const contextBody = (error as { context?: { body?: unknown } }).context?.body;
    if (typeof contextBody === "string") {
      try {
        const parsed = JSON.parse(contextBody);
        if (parsed?.error) return { error: parsed.error };
      } catch {
        // not JSON — fall through
      }
    }
    return { error: "تعذّر بدء عملية الدفع الآن. حاول مرة أخرى." };
  }

  if (data?.error) return { error: data.error };
  if (!data?.paymentUrl) return { error: "تعذّر فتح صفحة الدفع." };
  return { paymentUrl: data.paymentUrl, orderId: data.orderId };
}

export async function getPromotionOrder(orderId: string): Promise<PromotionOrder | null> {
  const { data, error } = await supabase
    .from("promotion_orders")
    .select("id, target_type, target_id, plan_code, amount_halalas, status, featured_until, created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("[promotions] order load failed", error);
    return null;
  }
  return (data as PromotionOrder | null) ?? null;
}

/**
 * Whether paid promotion is available at all. The plans table is empty (or
 * all-inactive) until pricing is configured, which is what keeps the feature
 * invisible in the app before the payment keys are in place.
 */
export async function isPromotionAvailable(): Promise<boolean> {
  const { count, error } = await supabase
    .from("promotion_plans")
    .select("code", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Asks the server to confirm a payment with the provider and apply the
 * promotion if it really went through.
 *
 * Called when the user returns from the hosted payment page. The return
 * itself proves nothing — the customer's browser controls it — so the answer
 * always comes from the server checking with the provider directly.
 */
export async function verifyPromotionPayment(
  orderId: string,
): Promise<{ status?: string; applied?: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("verify-promotion-payment", {
    body: { orderId },
  });
  if (error) {
    console.error("[promotions] verify failed", error);
    return { error: "تعذّر التحقق من حالة الدفع." };
  }
  if (data?.error) return { error: data.error };
  return { status: data?.status, applied: data?.applied };
}
