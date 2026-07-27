// Miyar (معيار) — AI analysis of a listing or franchise, framed as a
// qualitative review by an economics/finance/accounting expert.
//
// STATUS: scaffold only. This function is written but NOT deployed and NOT
// called from any UI. It stays dormant until an LLM API key exists and the
// feature is explicitly turned on — see ai_reports migration
// (0025_add_franchise_module_and_ai_reports_scaffold.sql) for the schema and
// RLS this relies on.
//
// Deliberate legal-safety choice (per the plan discussed with the product
// owner): the output is a qualitative report — strengths, weaknesses,
// clarifying questions, and risk flags — with NO numeric "score out of 100"
// or investment-grade rating. A single authoritative-looking number invites
// readers to treat it as investment advice, which this platform explicitly
// is not (see migration 0001's ads-and-verification-only posture). Keep this
// shape even when wiring the feature up for real.
//
// Auth model: like every other Edge Function in this project, this NEVER
// uses a service_role key. It only ever acts as the calling user via
// `supabase.functions.invoke()`, which forwards the caller's JWT. Every read
// goes through a client built with that JWT, so RLS is the only thing
// deciding what this function can see — an owner can request a report for
// their own listing/franchise, an admin for any, and nobody else gets past
// "not found". Nothing here is more privileged than the caller already is.

import { createClient } from "jsr:@supabase/supabase-js@2";

type TargetType = "listing" | "franchise";

type AiReportContent = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  clarifying_questions: string[];
  risk_flags: string[];
  disclaimer: string;
};

const SYSTEM_PROMPT = `أنت خبير اقتصاد ومالية ومحاسبة يراجع بيانات مشروع تجاري أو امتياز
معروض على منصة "معيار" السعودية. مهمتك تحليل البيانات المُقدَّمة فقط — لا تخترع
أرقامًا أو حقائق غير موجودة في المُدخلات، ولا تفترض معلومات عن السوق لم تُذكر.

قواعد صارمة:
- لا تُصدر أي تقييم رقمي إجمالي (لا "درجة من 100"، لا "تصنيف استثماري"،
  لا نجوم). هذا تحليل نوعي وصفي فقط.
- لا تنصح بالشراء أو الاستثمار أو عدمه بشكل مباشر — صف نقاط القوة والضعف
  والأسئلة التي يجب أن يطرحها أي طرف مهتم قبل اتخاذ قراره بنفسه.
- التزم حصريًا بالبيانات المُقدَّمة في المُدخل.
- أجب بالعربية الفصحى، بأسلوب مهني موجز.

أعد الإجابة بصيغة JSON فقط تطابق هذا الشكل بالضبط، بدون أي نص خارج الـJSON:
{
  "summary": "فقرة موجزة (3-5 جمل) تلخّص طبيعة المشروع وأبرز ملاحظاتك",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "..."],
  "weaknesses": ["نقطة ضعف أو غموض 1", "..."],
  "clarifying_questions": ["سؤال يجب طرحه على صاحب المشروع قبل أي قرار", "..."],
  "risk_flags": ["مخاطرة أو عدم اتساق في البيانات يستحق الانتباه", "..."]
}`;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let targetType: TargetType | undefined;
  let targetId: string | undefined;
  try {
    const body = await req.json();
    targetType = body?.targetType === "franchise" ? "franchise" : body?.targetType === "listing" ? "listing" : undefined;
    targetId = typeof body?.targetId === "string" ? body.targetId : undefined;
  } catch {
    // fall through to validation below
  }
  if (!targetType || !targetId) {
    return json({ error: "targetType and targetId are required" }, 400);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    // Expected until the product owner provisions a key — fail loudly rather
    // than silently, since a caller reaching this function means the UI gate
    // that's supposed to keep this feature hidden was bypassed somehow.
    return json({ error: "AI analysis is not configured yet" }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Every read below goes through this client, built with the CALLER's own
  // JWT — never a service_role key. RLS decides what's visible, exactly as
  // if the caller queried the table directly.
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
  } = await asUser.auth.getUser();
  if (!user) {
    return json({ error: "unauthorized" }, 401);
  }

  const table = targetType === "listing" ? "listings" : "franchises";
  const { data: target, error: targetError } = await asUser
    .from(table)
    .select("*")
    .eq("id", targetId)
    .maybeSingle();

  if (targetError || !target) {
    // RLS hides rows the caller can't see (not owner, not admin, not
    // published) — "not found" either way, same as every other endpoint here.
    return json({ error: "target not found" }, 404);
  }

  const { data: report, error: insertError } = await asUser
    .from("ai_reports")
    .insert({
      target_type: targetType,
      target_id: targetId,
      requested_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !report) {
    console.error("[ai-analysis] failed to create report row", insertError);
    return json({ error: "could not start analysis" }, 500);
  }

  try {
    const content = await runAnalysis(apiKey, targetType, target);

    const { error: updateError } = await asUser
      .from("ai_reports")
      .update({
        status: "completed",
        model_version: "claude-sonnet-5",
        content,
      })
      .eq("id", report.id);

    if (updateError) {
      console.error("[ai-analysis] failed to save completed report", updateError);
      return json({ error: "analysis completed but could not be saved" }, 500);
    }

    return json({ reportId: report.id, content });
  } catch (err) {
    console.error("[ai-analysis] model call failed", err);
    await asUser.from("ai_reports").update({ status: "failed" }).eq("id", report.id);
    return json({ error: "analysis failed" }, 502);
  }
});

async function runAnalysis(
  apiKey: string,
  targetType: TargetType,
  target: Record<string, unknown>,
): Promise<AiReportContent> {
  const userPrompt = `نوع الهدف: ${targetType === "listing" ? "مشروع للبيع (حصة جزئية)" : "امتياز تجاري"}
بيانات الهدف (JSON):
${JSON.stringify(target, null, 2)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API returned ${res.status}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("unexpected Anthropic API response shape");
  }

  const parsed = JSON.parse(text) as Omit<AiReportContent, "disclaimer">;
  return {
    ...parsed,
    disclaimer:
      "هذا تحليل آلي وصفي لا يشكّل نصيحة استثمارية أو مالية، ولا يغني عن التوثيق المحاسبي أو الاستشارة المهنية المستقلة.",
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
