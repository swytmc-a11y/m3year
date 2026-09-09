// Deletes — or, when the schema will not allow a real delete, anonymises —
// the caller's own account. Called with the caller's own session; the
// service role is used only for the two operations that require it.
//
// This cannot be a plain auth.admin.deleteUser() call. bookings.customer_id
// references profiles ON DELETE RESTRICT, deliberately: a booking is a
// financial record with tax retention obligations, and it must outlive the
// account that made it. Postgres will refuse to delete a profile — and so
// refuse the cascading delete of the auth user — for anyone who has EVER
// completed a booking, not only someone with one open now. Calling the
// simple version of this function (as Miyar's does, where no such
// constraint exists) would make account deletion fail for most customers
// with an opaque database error.
//
// So there are three outcomes:
//   1. An unresolved booking exists (still pending payment/confirmation, or
//      confirmed, or in progress) — refused outright. The customer is asked
//      to resolve it first, same as the privacy policy says.
//   2. No booking ever existed for this account — a real delete. Nothing
//      references the profile, so it cascades cleanly.
//   3. Only finished bookings exist (completed/cancelled/rejected/expired) —
//      the booking rows must stay, so the account is anonymised instead:
//      personal fields are cleared, uploaded documents are removed from
//      storage, and the auth user is banned and stripped of its login
//      credentials rather than deleted. The booking history remains
//      attached to a profile row that no longer identifies anyone.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// A booking in any of these states still needs the account behind it —
// someone has to pay, be reachable for confirmation, or return the car.
const UNRESOLVED_STATUSES = ["pending_payment", "pending_confirmation", "confirmed", "active"];

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
  const userId = userData.user.id;

  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: bookings, error: bookingsError } = await asAdmin
    .from("bookings")
    .select("status")
    .eq("customer_id", userId);

  if (bookingsError) {
    console.error("[delete-account] booking lookup failed", bookingsError);
    return json({ error: "تعذّر التحقق من حجوزاتك الآن." }, 500);
  }

  const hasUnresolved = (bookings ?? []).some((b) => UNRESOLVED_STATUSES.includes(b.status));
  if (hasUnresolved) {
    return json(
      { error: "لديك حجز قائم لم يكتمل بعد. أكمله أو ألغِه أولًا ثم أعد المحاولة." },
      409,
    );
  }

  // Best-effort: an orphaned file left behind is a cleanup nit, not a reason
  // to abort a customer's deletion request.
  await asAdmin.storage.from("customer-documents").remove([
    `${userId}/id.jpg`, `${userId}/id.jpeg`, `${userId}/id.png`, `${userId}/id.webp`,
    `${userId}/license.jpg`, `${userId}/license.jpeg`, `${userId}/license.png`, `${userId}/license.webp`,
  ]);

  if ((bookings ?? []).length === 0) {
    // Nothing references this profile — the cascade from auth.users is clean.
    const { error: deleteError } = await asAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[delete-account] deleteUser failed", deleteError);
      return json({ error: "تعذّر حذف الحساب الآن. حاول مرة أخرى." }, 500);
    }
    return json({ deleted: true });
  }

  // Finished bookings exist and must be kept — anonymise instead of deleting.
  const { error: profileError } = await asAdmin
    .from("profiles")
    .update({
      full_name: null,
      email: null,
      phone: null,
      city: null,
      national_id: null,
      license_number: null,
      id_document_path: null,
      license_document_path: null,
      documents_check: null,
      documents_check_note: null,
    })
    .eq("id", userId);

  if (profileError) {
    console.error("[delete-account] profile anonymise failed", profileError);
    return json({ error: "تعذّر حذف بياناتك الآن. حاول مرة أخرى." }, 500);
  }

  // Locks the account out for good and removes the credentials that would
  // let anyone sign back into it — a scrambled email is not a real address,
  // and the random password is discarded immediately after being set.
  const { error: banError } = await asAdmin.auth.admin.updateUserById(userId, {
    email: `deleted-${userId}@deleted.invalid`,
    phone: undefined,
    password: crypto.randomUUID(),
    ban_duration: "87600h", // ~10 years — Supabase has no literal "forever".
    user_metadata: {},
  });

  if (banError) {
    console.error("[delete-account] ban failed", banError);
    return json({ error: "حُذفت بياناتك لكن تعذّر إغلاق الحساب بالكامل." }, 500);
  }

  return json({ deleted: true, anonymized: true });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
