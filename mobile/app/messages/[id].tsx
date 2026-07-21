import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/ui";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { sendMessage, markMessagesRead } from "@/lib/messaging";
import { colors, fonts, radius } from "@/theme";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    const { data: conv } = await supabase
      .from("conversations")
      .select("owner_id, investor_id, listing:listings(title)")
      .eq("id", String(id))
      .maybeSingle();

    if (conv && user) {
      const counterpartId = conv.owner_id === user.id ? conv.investor_id : conv.owner_id;
      const { data: counterpart } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", counterpartId)
        .maybeSingle();
      const listingTitle =
        (conv as unknown as { listing?: { title?: string } }).listing?.title ?? "";
      setTitle(counterpart?.full_name ? `${counterpart.full_name} · ${listingTitle}` : listingTitle);
    }

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", String(id))
      .order("created_at", { ascending: true });

    setMessages(data ?? []);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates while the thread is open.
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Mark incoming (not mine) unread messages as read once loaded/updated.
  useEffect(() => {
    if (!user) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at);
    if (unread.length > 0) {
      markMessagesRead(unread.map((m) => m.id));
    }
  }, [messages, user]);

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  async function onSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setDraft("");
    setSending(true);
    const { error } = await sendMessage(String(id), body);
    setSending(false);
    if (error) {
      setDraft(body);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title={title || "المحادثة"} onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const mine = item.sender_id === user?.id;
              return (
                <View
                  style={{
                    alignSelf: mine ? "flex-start" : "flex-end",
                    maxWidth: "78%",
                    backgroundColor: mine ? colors.ink : colors.white,
                    borderColor: mine ? colors.ink : colors.grid,
                    borderWidth: 1,
                    borderRadius: radius.lg,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      lineHeight: 21,
                      color: mine ? colors.white : colors.ink,
                      textAlign: "right",
                    }}
                  >
                    {item.body}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText }}>
                  ابدأ المحادثة برسالة.
                </Text>
              </View>
            }
          />
        )}

        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 10,
            padding: 12,
            borderTopWidth: 1,
            borderTopColor: colors.grid,
            backgroundColor: colors.white,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="اكتب رسالة..."
            placeholderTextColor={colors.mutedText}
            multiline
            style={{
              flex: 1,
              maxHeight: 100,
              borderWidth: 1,
              borderColor: colors.grid,
              borderRadius: radius.pill,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.ink,
              textAlign: "right",
            }}
          />
          <Pressable
            onPress={onSend}
            disabled={sending || draft.trim().length === 0}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.ink,
              alignItems: "center",
              justifyContent: "center",
              opacity: sending || draft.trim().length === 0 ? 0.5 : 1,
            }}
          >
            <Text style={{ color: colors.white, fontSize: 18 }}>←</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
