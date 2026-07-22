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
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, Button } from "@/components/ui";
import { RatingStarsInput, RatingSummaryLabel } from "@/components/rating-stars";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { sendMessage, markMessagesRead } from "@/lib/messaging";
import { getUserRatingSummary, getMyRating, submitRating, type RatingSummary } from "@/lib/ratings";
import { ratingFormSchema } from "@/lib/validations";
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
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const [listingId, setListingId] = useState<string | null>(null);
  const [counterpartId, setCounterpartId] = useState<string | null>(null);
  const [counterpartName, setCounterpartName] = useState<string | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary>({ average: 0, count: 0 });
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [rateError, setRateError] = useState<string | undefined>();
  const [rateSubmitting, setRateSubmitting] = useState(false);

  const load = useCallback(
    async (isActive: () => boolean = () => true) => {
      setLoadError(false);
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .select("listing_id, owner_id, investor_id, listing:listings(title)")
        .eq("id", String(id))
        .maybeSingle();

      if (!isActive()) return;

      if (convError) {
        console.error("[messages] load conversation failed", convError);
        setLoadError(true);
        setLoading(false);
        return;
      }

      if (conv && user) {
        const counterpart = conv.owner_id === user.id ? conv.investor_id : conv.owner_id;
        setListingId(conv.listing_id);
        setCounterpartId(counterpart);

        const [{ data: counterpartProfile }, summary, myRating] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", counterpart).maybeSingle(),
          getUserRatingSummary(counterpart),
          getMyRating(counterpart, conv.listing_id),
        ]);

        if (!isActive()) return;

        const listingTitle =
          (conv as unknown as { listing?: { title?: string } }).listing?.title ?? "";
        setCounterpartName(counterpartProfile?.full_name ?? null);
        setTitle(
          counterpartProfile?.full_name ? `${counterpartProfile.full_name} · ${listingTitle}` : listingTitle,
        );
        setRatingSummary(summary);
        if (myRating) {
          setMyScore(myRating.score);
          setMyComment(myRating.comment ?? "");
        }
      }

      const { data, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", String(id))
        .order("created_at", { ascending: true });

      if (!isActive()) return;

      if (messagesError) {
        console.error("[messages] load messages failed", messagesError);
        setLoadError(true);
      } else {
        setMessages(data ?? []);
      }
      setLoading(false);
    },
    [id, user],
  );

  // Runs on mount and every time the screen regains focus, so messages that
  // arrived while backgrounded are caught up (the realtime channel below
  // only covers updates while this screen is actively mounted/open).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );

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

  async function onSubmitRating() {
    if (!counterpartId || !listingId) return;
    setRateError(undefined);
    const parsed = ratingFormSchema.safeParse({ score: myScore, comment: myComment });
    if (!parsed.success) {
      setRateError(parsed.error.issues[0].message);
      return;
    }

    setRateSubmitting(true);
    const { error } = await submitRating({
      ratedId: counterpartId,
      listingId,
      score: parsed.data.score,
      comment: parsed.data.comment,
    });
    setRateSubmitting(false);

    if (error) {
      setRateError(error);
      return;
    }
    setRateModalOpen(false);
    setRatingSummary(await getUserRatingSummary(counterpartId));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar
        title={title || "المحادثة"}
        onBack={() => router.back()}
        right={
          counterpartId ? (
            <Pressable
              onPress={() => setRateModalOpen(true)}
              style={{ alignItems: "flex-end", gap: 2 }}
            >
              <RatingSummaryLabel average={ratingSummary.average} count={ratingSummary.count} />
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.verify }}>
                {myScore > 0 ? "عدّل تقييمك" : "قيّم"}
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      <Modal visible={rateModalOpen} transparent animationType="fade" onRequestClose={() => setRateModalOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(23,26,28,0.5)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: radius.lg,
              padding: 24,
              gap: 16,
            }}
          >
            <Text
              style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.ink, textAlign: "right" }}
            >
              {counterpartName ? `قيّم ${counterpartName}` : "قيّم الطرف الآخر"}
            </Text>

            <View style={{ alignItems: "center" }}>
              <RatingStarsInput value={myScore} onChange={setMyScore} />
            </View>

            <TextInput
              value={myComment}
              onChangeText={setMyComment}
              placeholder="تعليق (اختياري)"
              placeholderTextColor={colors.mutedText}
              multiline
              style={{
                minHeight: 80,
                borderWidth: 1,
                borderColor: colors.grid,
                borderRadius: radius.md,
                padding: 12,
                fontFamily: fonts.body,
                fontSize: 14,
                color: colors.ink,
                textAlign: "right",
                textAlignVertical: "top",
              }}
            />

            {rateError ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.danger, textAlign: "right" }}>
                {rateError}
              </Text>
            ) : null}

            <Button label="إرسال التقييم" fullWidth loading={rateSubmitting} onPress={onSubmitRating} />
            <Button label="إلغاء" variant="ghost" fullWidth onPress={() => setRateModalOpen(false)} />
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : loadError ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "center" }}>
              تعذّر تحميل المحادثة الآن.
            </Text>
            <Button label="إعادة المحاولة" variant="ghost" onPress={() => load()} />
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
