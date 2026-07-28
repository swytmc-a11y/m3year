// Miyar (معيار) — permanently deletes the caller's own account.
//
// Called by the mobile app with the caller's own session (client-invoked
// pattern, same as notify-new-message). verify_jwt stays enabled so an
// unauthenticated request never reaches this code.
//
// Two clients, same reasoning as notify-new-message:
//   - `asUser` (anon key + caller's Authorization header): used only to
//     resolve who the caller actually is via auth.getUser(). Never used to
//     look up someone else — there is nothing here for it to look up beyond
//     the caller's own identity.
//   - `asAdmin` (service role key, platform-injected): auth.admin.deleteUser
//     is only reachable with service_role. It deletes the auth.users row,
//     which cascades to profiles, profile_contact, listings, franchises,
//     conversations, messages, favorites, ratings, notifications, and every
//     other table with an owner_id/user_id foreign key to profiles — the
//     same cascade already verified when the database was cleared earlier
//     this project (see migration history / session notes), not new
//     behavior invented here.
//
// The client is expected to have already re-confirmed the password before
// calling this (destructive, irreversible action) — this function itself
// only checks that the caller is who their access token says they are.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("[delete-account] unhandled error", err);
    return json({ error: "تعذّر حذف الحساب الآن. حاول مرة أخرى." }, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "لم يتم التعرّف على الجلسة." }, 401);
  }

  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { error: deleteError } = await asAdmin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    console.error("[delete-account] deleteUser failed", deleteError);
    return json({ error: "تعذّر حذف الحساب الآن. حاول مرة أخرى." }, 500);
  }

  return json({ deleted: true });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
