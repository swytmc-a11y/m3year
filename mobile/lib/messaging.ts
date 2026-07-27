import { supabase } from "@/lib/supabase";

export type ConversationSummary = {
  id: string;
  listing_id: string | null;
  franchise_id: string | null;
  owner_id: string;
  investor_id: string;
  created_at: string;
  listing_title: string;
  counterpart_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

/**
 * Starts a conversation between the current user (as investor) and a
 * listing's owner, or returns the existing one if already open. RLS enforces
 * the listing must be published and the investor isn't the owner; the unique
 * constraint on (listing_id, investor_id) makes this safe to call repeatedly.
 */
export async function getOrCreateConversation(
  listingId: string,
  ownerId: string,
): Promise<{ conversationId?: string; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  if (user.id === ownerId) {
    return { error: "لا يمكنك التواصل مع نفسك." };
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("investor_id", user.id)
    .maybeSingle();

  if (existing) return { conversationId: existing.id };

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, owner_id: ownerId, investor_id: user.id })
    .select("id")
    .single();

  if (error) {
    console.error("[messaging] create conversation failed", error);
    return { error: "تعذّر بدء المحادثة الآن. حاول مرة أخرى." };
  }
  return { conversationId: created.id };
}

/**
 * Same as getOrCreateConversation but for a franchise target — mirrors the
 * listing flow exactly (unique constraint on (franchise_id, investor_id)).
 */
export async function getOrCreateFranchiseConversation(
  franchiseId: string,
  ownerId: string,
): Promise<{ conversationId?: string; error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة. سجّل الدخول مرة أخرى." };

  if (user.id === ownerId) {
    return { error: "لا يمكنك التواصل مع نفسك." };
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("franchise_id", franchiseId)
    .eq("investor_id", user.id)
    .maybeSingle();

  if (existing) return { conversationId: existing.id };

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ franchise_id: franchiseId, owner_id: ownerId, investor_id: user.id })
    .select("id")
    .single();

  if (error) {
    console.error("[messaging] create franchise conversation failed", error);
    return { error: "تعذّر بدء المحادثة الآن. حاول مرة أخرى." };
  }
  return { conversationId: created.id };
}

export async function listMyConversations(): Promise<{
  data?: ConversationSummary[];
  error?: string;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id, listing_id, franchise_id, owner_id, investor_id, created_at, listing:listings(title), franchise:franchises(brand_name)",
    )
    .or(`owner_id.eq.${user.id},investor_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error || !conversations) {
    console.error("[messaging] list conversations failed", error);
    return { error: "تعذّر تحميل المحادثات الآن." };
  }

  const summaries = await Promise.all(
    conversations.map(async (c) => {
      const counterpartId = c.owner_id === user.id ? c.investor_id : c.owner_id;

      const [{ data: counterpart }, { data: lastMessage }, { count: unreadCount }] =
        await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", counterpartId).maybeSingle(),
          supabase
            .from("messages")
            .select("body, attachment_type, created_at")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", c.id)
            .neq("sender_id", user.id)
            .is("read_at", null),
        ]);

      return {
        id: c.id,
        listing_id: c.listing_id,
        franchise_id: c.franchise_id,
        owner_id: c.owner_id,
        investor_id: c.investor_id,
        created_at: c.created_at,
        listing_title:
          (c as unknown as { listing?: { title?: string } }).listing?.title ??
          (c as unknown as { franchise?: { brand_name?: string } }).franchise
            ?.brand_name ??
          "إعلان",
        counterpart_name: counterpart?.full_name ?? null,
        last_message:
          lastMessage?.body ??
          (lastMessage?.attachment_type === "image"
            ? "📷 صورة"
            : lastMessage?.attachment_type === "file"
              ? "📎 ملف"
              : null),
        last_message_at: lastMessage?.created_at ?? null,
        unread_count: unreadCount ?? 0,
      } satisfies ConversationSummary;
    }),
  );

  return { data: summaries };
}

export type OutgoingAttachment = {
  path: string;
  type: "image" | "file";
  name: string;
};

export async function sendMessage(
  conversationId: string,
  body: string,
  attachment?: OutgoingAttachment,
): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "انتهت الجلسة." };

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.length > 0 ? body : null,
      attachment_path: attachment?.path ?? null,
      attachment_type: attachment?.type ?? null,
      attachment_name: attachment?.name ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[messaging] send failed", error);
    return { error: "تعذّر إرسال الرسالة الآن." };
  }

  // Best-effort push notification to the recipient; failures here must never
  // block the message from being sent (it's already saved above).
  supabase.functions
    .invoke("notify-new-message", { body: { messageId: message.id } })
    .catch((err) => console.error("[messaging] notify invoke failed", err));

  return {};
}

export async function markMessagesRead(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .in("id", messageIds);
  if (error) console.error("[messaging] mark read failed", error);
}
