// Looks at the identity and licence photos a customer uploaded and decides
// whether they are plausibly the documents they claim to be.
//
// This is a first pass, not the decision. The operator still reviews the
// documents when confirming the booking — what this prevents is a customer
// reaching that review having uploaded a screenshot, a blank page, or a photo
// of their cat, and holding a car's dates while they do.
//
// Three properties matter here:
//
//   1. The verdict is written with the service role, never by the customer.
//      guard_profile_privileges() freezes the verdict columns against the
//      customer's own updates precisely so this function is the only way an
//      "accepted" can appear.
//
//   2. Which documents get checked is read from the caller's own profile
//      through their JWT, so nobody can point this at another customer's
//      files by passing an id.
//
//   3. Without a provider key it is dormant and says so, leaving the verdict
//      at 'pending'. The booking gate treats 'pending' as passable, so a
//      missing key delays no one — it just means the operator's review is the
//      only review.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

// Signed URLs are minted only long enough for the model to fetch the bytes.
const SIGNED_URL_TTL_SECONDS = 120;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `أنت تفحص صورًا رفعها عميل في تطبيق تأجير سيارات سعودي.

مهمتك: تحديد ما إذا كانت كل صورة هي فعلًا المستند المطلوب.

المستند الأول يجب أن يكون: بطاقة هوية وطنية سعودية أو رخصة إقامة (إقامة).
المستند الثاني يجب أن يكون: رخصة قيادة سعودية.

اقبل الصورة إذا كانت المستند المطلوب وكانت بياناته الأساسية مقروءة، حتى لو
كانت الصورة مائلة أو فيها انعكاس بسيط.

ارفض إذا كانت: صورة لشيء آخر تمامًا، أو لقطة شاشة، أو صفحة فارغة، أو صورة
غير مقروءة إطلاقًا، أو مستند من نوع مختلف عن المطلوب.

أجب بصيغة JSON فقط، بلا أي نص آخر:
{"id_ok": true|false, "license_ok": true|false, "reason": "سبب مختصر بالعربية إذا رُفض أي منهما، وإلا اتركه فارغًا"}`;

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[check-customer-documents] unhandled error", err);
    return json({ error: "تعذّر فحص المستندات الآن." }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "لم يتم التعرّف على الجلسة." }, 401);
  }
  const userId = userData.user.id;

  // Read through the caller's own client: the paths checked are whatever this
  // customer's profile says, never anything named in the request.
  const { data: profile, error: profileError } = await asUser
    .from("profiles")
    .select("id_document_path, license_document_path")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("[check-customer-documents] profile lookup failed", profileError);
    return json({ error: "تعذّر قراءة بيانات الحساب." }, 500);
  }
  if (!profile.id_document_path || !profile.license_document_path) {
    return json({ error: "ارفع صورة الهوية وصورة الرخصة أولًا." }, 400);
  }

  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    // Dormant, and deliberately not an error: the documents are stored and
    // the operator reviews them. Leaving the verdict at 'pending' keeps the
    // booking gate open rather than stranding customers behind a check that
    // was never switched on.
    console.warn("[check-customer-documents] ANTHROPIC_API_KEY not configured — leaving verdict pending");
    await asAdmin
      .from("profiles")
      .update({ documents_check: "pending", documents_check_note: null })
      .eq("id", userId);
    return json({ status: "pending", configured: false });
  }

  const [idImage, licenseImage] = await Promise.all([
    fetchDocument(asAdmin, profile.id_document_path),
    fetchDocument(asAdmin, profile.license_document_path),
  ]);

  if (!idImage || !licenseImage) {
    console.error("[check-customer-documents] could not read uploaded files");
    return json({ error: "تعذّر قراءة الملفات المرفوعة. أعد رفعها." }, 400);
  }

  const verdict = await askModel(apiKey, idImage, licenseImage);
  if (!verdict) {
    // A provider failure must not reject a customer who may have uploaded
    // perfectly good documents. Leave it for the operator.
    await asAdmin
      .from("profiles")
      .update({ documents_check: "pending", documents_check_note: null, documents_checked_at: new Date().toISOString() })
      .eq("id", userId);
    return json({ status: "pending", configured: true });
  }

  const accepted = verdict.id_ok && verdict.license_ok;
  const note = accepted ? null : (verdict.reason || "الصور المرفوعة ليست مستندات صالحة.");

  const { error: updateError } = await asAdmin
    .from("profiles")
    .update({
      documents_check: accepted ? "accepted" : "rejected",
      documents_check_note: note,
      documents_checked_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    console.error("[check-customer-documents] verdict write failed", updateError);
    return json({ error: "تعذّر حفظ نتيجة الفحص." }, 500);
  }

  return json({ status: accepted ? "accepted" : "rejected", note, configured: true });
}

type DocumentImage = { mediaType: string; base64: string };

async function fetchDocument(
  admin: ReturnType<typeof createClient>,
  path: string,
): Promise<DocumentImage | null> {
  const { data, error } = await admin.storage
    .from("customer-documents")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error("[check-customer-documents] sign failed", path, error);
    return null;
  }

  const res = await fetch(data.signedUrl);
  if (!res.ok) return null;

  const mediaType = res.headers.get("content-type") ?? "image/jpeg";
  // PDFs and HEIC cannot be sent as images; those are left for the operator.
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mediaType)) return null;

  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { mediaType, base64: btoa(binary) };
}

type Verdict = { id_ok: boolean; license_ok: boolean; reason: string };

async function askModel(
  apiKey: string,
  idImage: DocumentImage,
  licenseImage: DocumentImage,
): Promise<Verdict | null> {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "المستند الأول (هوية أو إقامة):" },
            { type: "image", source: { type: "base64", media_type: idImage.mediaType, data: idImage.base64 } },
            { type: "text", text: "المستند الثاني (رخصة قيادة):" },
            { type: "image", source: { type: "base64", media_type: licenseImage.mediaType, data: licenseImage.base64 } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("[check-customer-documents] provider returned", res.status, await res.text().catch(() => ""));
    return null;
  }

  const body = await res.json().catch(() => null);
  const text: string | undefined = body?.content?.[0]?.text;
  if (!text) return null;

  try {
    // The model is told to answer in bare JSON, but a stray sentence around
    // it should not turn a good answer into a provider failure.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(text.slice(start, end + 1));
    return {
      id_ok: parsed.id_ok === true,
      license_ok: parsed.license_ok === true,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    console.error("[check-customer-documents] could not parse verdict", text);
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
