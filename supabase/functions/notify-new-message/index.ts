// Miyar (معيار) — sends an Expo push notification for a newly sent message.
//
// Called by the mobile app (client-invoked, not a DB trigger) right after a
// message insert succeeds, using the sender's own session — the standard
// "invoke with the caller's JWT" pattern. verify_jwt stays enabled so Supabase
// rejects unauthenticated calls before this code ever runs.
//
// Two Supabase clients are used deliberately:
//   - `asUser`  (anon key + caller's Authorization header): every read of
//     messages/conversations/profiles goes through this client, so RLS proves
//     the caller is actually a participant in the conversation. If they are
//     not, the row is simply invisible and this function reports "not found".
//   - `asAdmin` (service role key, auto-injected by the Edge Runtime — never
//     configured by us): used ONLY to read the recipient's own push tokens,
//     which the sender could never see under the recipient's RLS policies.
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided
// automatically to every Edge Function by the platform; no secret is stored
// or handled by us here.

import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let messageId: string | undefined;
  try {
    const body = await req.json();
    messageId = typeof body?.messageId === "string" ? body.messageId : undefined;
  } catch {
    // fall through to validation below
  }
  if (!messageId) {
    return json({ error: "messageId is required" }, 400);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  const { data: message, error: messageError } = await asUser
    .from("messages")
    .select("id, sender_id, body, conversation_id")
    .eq("id", messageId)
    .maybeSingle();

  if (messageError || !message) {
    // RLS hides messages the caller isn't part of — treat as not found either way.
    return json({ error: "message not found" }, 404);
  }
  if (message.sender_id !== user.id) {
    return json({ error: "only the sender can trigger this notification" }, 403);
  }

  const { data: conversation, error: convError } = await asUser
    .from("conversations")
    .select("id, owner_id, investor_id, listing_id, listings(title)")
    .eq("id", message.conversation_id)
    .maybeSingle();

  if (convError || !conversation) {
    return json({ error: "conversation not found" }, 404);
  }

  const recipientId =
    conversation.owner_id === user.id ? conversation.investor_id : conversation.owner_id;

  const { data: senderProfile } = await asUser
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const asAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: tokens } = await asAdmin
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", recipientId);

  if (!tokens || tokens.length === 0) {
    return json({ sent: 0 });
  }

  const listingTitle =
    (conversation as unknown as { listings?: { title?: string } }).listings?.title ??
    "معيار";
  const senderName = senderProfile?.full_name || "مستخدم";

  // body is null for an attachment-only message (see sendMessage), which
  // used to throw here and turn the whole push into a 500.
  const preview = message.body ? message.body.slice(0, 180) : "📎 مرفق";

  const messages = tokens.map((t) => ({
    to: t.expo_push_token,
    title: `${senderName} · ${listingTitle}`,
    body: preview,
    sound: "default",
    data: {
      type: "message",
      conversationId: conversation.id,
    },
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });
    const result = await res.json().catch(() => null);
    return json({ sent: messages.length, expo: result });
  } catch (err) {
    console.error("[notify-new-message] Expo push request failed", err);
    return json({ error: "push send failed" }, 502);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
