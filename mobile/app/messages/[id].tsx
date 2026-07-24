import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Modal,
  Image,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { TopBar, Button } from "@/components/ui";
import { RatingStarsInput, RatingSummaryLabel } from "@/components/rating-stars";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { sendMessage, markMessagesRead, type OutgoingAttachment } from "@/lib/messaging";
import { uploadMessageAttachment, getMessageAttachmentSignedUrl } from "@/lib/storage";
import { getUserRatingSummary, getMyRating, submitRating, type RatingSummary } from "@/lib/ratings";
import { ratingFormSchema } from "@/lib/validations";
import { colors, fonts, radius } from "@/theme";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  attachment_type: "image" | "file" | null;
  attachment_name: string | null;
  read_at: string | null;
  created_at: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // Dynamically measured header height so the keyboard offset is exact on
  // every device instead of a hardcoded guess.
  const [headerHeight, setHeaderHeight] = useState(0);
  const [keyboardShown, setKeyboardShown] = useState(false);

  // Signed URLs for private attachments, keyed by storage path.
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const [listingId, setListingId] = useState<string | null>(null);
  const [counterpartId, setCounterpartId] = useState<string | null>(null);
  const [counterpartName, setCounterpartName] = useState<string | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary>({ average: 0, count: 0 });
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [rateError, setRateError] = useState<string | undefined>();
  const [rateSubmitting, setRateSubmitting] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, () => setKeyboardShown(true));
    const h = Keyboard.addListener(hideEvt, () => setKeyboardShown(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

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
        setMessages((data ?? []) as Message[]);
      }
      setLoading(false);
    },
    [id, user],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );

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

  useEffect(() => {
    if (!user) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at);
    if (unread.length > 0) {
      markMessagesRead(unread.map((m) => m.id));
    }
  }, [messages, user]);

  // Resolve signed URLs for any attachment paths we haven't fetched yet.
  useEffect(() => {
    const pending = messages
      .map((m) => m.attachment_path)
      .filter((p): p is string => !!p && !attachmentUrls[p]);
    if (pending.length === 0) return;
    let active = true;
    (async () => {
      const resolved = await Promise.all(
        pending.map(async (path) => [path, await getMessageAttachmentSignedUrl(path)] as const),
      );
      if (!active) return;
      setAttachmentUrls((prev) => {
        const next = { ...prev };
        for (const [path, url] of resolved) if (url) next[path] = url;
        return next;
      });
    })();
    return () => {
      active = false;
    };
  }, [messages, attachmentUrls]);

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

  async function sendAttachment(attachment: OutgoingAttachment) {
    setAttaching(true);
    const { error } = await sendMessage(String(id), "", attachment);
    setAttaching(false);
    if (error) {
      console.error("[messages] send attachment failed", error);
    }
  }

  async function onPickImage() {
    setAttachMenuOpen(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setAttaching(true);
    const asset = result.assets[0];
    const name = asset.fileName ?? `image-${Date.now()}.jpg`;
    const { path, error } = await uploadMessageAttachment(String(id), asset.uri, name);
    if (error || !path) {
      setAttaching(false);
      return;
    }
    await sendAttachment({ path, type: "image", name });
  }

  async function onPickFile() {
    setAttachMenuOpen(false);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;

    setAttaching(true);
    const asset = result.assets[0];
    const { path, error } = await uploadMessageAttachment(String(id), asset.uri, asset.name);
    if (error || !path) {
      setAttaching(false);
      return;
    }
    await sendAttachment({ path, type: "file", name: asset.name });
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

  function renderBubble(item: Message) {
    const mine = item.sender_id === user?.id;
    const bubbleColor = mine ? colors.ink : colors.white;
    const textColor = mine ? colors.white : colors.ink;
    const url = item.attachment_path ? attachmentUrls[item.attachment_path] : undefined;

    return (
      <View
        style={{
          alignSelf: mine ? "flex-start" : "flex-end",
          maxWidth: "78%",
          backgroundColor: bubbleColor,
          borderColor: mine ? colors.ink : colors.grid,
          borderWidth: 1,
          borderRadius: radius.lg,
          overflow: "hidden",
          paddingHorizontal: item.attachment_type === "image" ? 0 : 14,
          paddingVertical: item.attachment_type === "image" ? 0 : 10,
        }}
      >
        {item.attachment_type === "image" ? (
          url ? (
            <Pressable onPress={() => Linking.openURL(url)}>
              <Image
                source={{ uri: url }}
                style={{ width: 220, height: 220, backgroundColor: colors.paper }}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <View
              style={{
                width: 220,
                height: 220,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.paper,
              }}
            >
              <ActivityIndicator color={colors.mutedText} />
            </View>
          )
        ) : item.attachment_type === "file" ? (
          <Pressable
            onPress={() => url && Linking.openURL(url)}
            style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}
          >
            <Text style={{ fontSize: 20 }}>📎</Text>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 14,
                color: textColor,
                textAlign: "right",
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {item.attachment_name ?? "ملف"}
            </Text>
          </Pressable>
        ) : null}

        {item.body ? (
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              lineHeight: 21,
              color: textColor,
              textAlign: "right",
              paddingHorizontal: item.attachment_type === "image" ? 14 : 0,
              paddingTop: item.attachment_type === "image" ? 8 : 0,
              paddingBottom: item.attachment_type === "image" ? 10 : 0,
            }}
          >
            {item.body}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
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
      </View>

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

      {/* Attachment picker sheet */}
      <Modal visible={attachMenuOpen} transparent animationType="fade" onRequestClose={() => setAttachMenuOpen(false)}>
        <Pressable style={{ flex: 1, justifyContent: "flex-end" }} onPress={() => setAttachMenuOpen(false)}>
          <View
            style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: 16,
              paddingBottom: insets.bottom + 16,
              gap: 8,
            }}
          >
            <Pressable
              onPress={onPickImage}
              style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 22 }}>🖼️</Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink }}>صورة</Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.grid }} />
            <Pressable
              onPress={onPickFile}
              style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 22 }}>📎</Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink }}>ملف</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + headerHeight}
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
            keyboardDismissMode="interactive"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => renderBubble(item)}
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
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: keyboardShown ? 12 : insets.bottom + 12,
            borderTopWidth: 1,
            borderTopColor: colors.grid,
            backgroundColor: colors.white,
          }}
        >
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setAttachMenuOpen(true);
            }}
            disabled={attaching}
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              opacity: attaching ? 0.5 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel="إرفاق"
          >
            {attaching ? (
              <ActivityIndicator color={colors.mutedText} size="small" />
            ) : (
              <Text style={{ fontSize: 22, color: colors.subtleText }}>＋</Text>
            )}
          </Pressable>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="اكتب رسالة..."
            placeholderTextColor={colors.mutedText}
            multiline
            style={{
              flex: 1,
              maxHeight: 100,
              minHeight: 44,
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
            accessibilityRole="button"
            accessibilityLabel="إرسال"
          >
            <Text style={{ color: colors.white, fontSize: 18 }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
