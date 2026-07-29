import { useCallback, useState } from "react";
import { View, Text, FlatList, RefreshControl, Alert } from "react-native";
import { useRouter, useFocusEffect, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, EmptyState, IconButton, Skeleton, useRefreshTint, useToast } from "@/components/kit";
import { BlockIcon, ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { listBlockedUsers, unblockUser, type BlockedUser } from "@/lib/blocks";
import { fonts, radius } from "@/theme";

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const toast = useToast();
  const refreshTint = useRefreshTint();
  const { session, loading: authLoading } = useAuth();

  const [items, setItems] = useState<BlockedUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    const { data, error: err } = await listBlockedUsers();
    if (err) setError(true);
    else setItems(data ?? []);
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [load, session]),
  );

  if (authLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!session) return <Redirect href="/auth" />;

  function onUnblock(item: BlockedUser) {
    const name = item.full_name || "هذا المستخدم";
    Alert.alert(`إلغاء حظر ${name}؟`, "ستتمكنان من تبادل الرسائل مرة أخرى.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "إلغاء الحظر",
        onPress: async () => {
          setBusyId(item.blocked_id);
          const { error: err } = await unblockUser(item.blocked_id);
          setBusyId(null);
          if (err) return toast(err, "error");
          toast("تم إلغاء الحظر.", "success");
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>المستخدمون المحظورون</Text>
      </View>

      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.blocked_id}
        contentContainerStyle={{ padding: 18, paddingTop: 4, gap: 10, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshTint} />}
        renderItem={({ item }) => (
          <Card style={{ padding: 16, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: t.text, flex: 1, textAlign: "right" }}>
              {item.full_name || "مستخدم"}
            </Text>
            <Button
              label="إلغاء الحظر"
              variant="secondary"
              loading={busyId === item.blocked_id}
              onPress={() => onUnblock(item)}
            />
          </Card>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 10 }}>
              <Skeleton width="100%" height={64} radius={radius.xl} />
              <Skeleton width="100%" height={64} radius={radius.xl} />
            </View>
          ) : error ? (
            <EmptyState
              title="تعذّر التحميل"
              description="تعذّر تحميل قائمة المحظورين الآن."
              action={<Button label="إعادة المحاولة" variant="secondary" onPress={() => load()} />}
            />
          ) : (
            <EmptyState
              icon={<BlockIcon color={t.textMuted} size={20} />}
              title="لا يوجد محظورون"
              description="عند حظر مستخدم من داخل المحادثة سيظهر هنا."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
