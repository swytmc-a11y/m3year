import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { deleteMyAccount } from "@/lib/account-actions";
import { unregisterPushToken } from "@/lib/push-notifications";
import { fonts } from "@/theme";

const CONFIRM_PHRASE = "حذف حسابي";

// Destructive and irreversible, so this asks for two independent proofs of
// intent: the account's own password (re-verified via signInWithPassword,
// not just "is there text in the field") and a typed confirmation phrase —
// either alone is too easy to trigger from an unlocked, unattended phone.
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }
  if (!session || !user?.email) {
    return <Redirect href="/auth" />;
  }

  async function onDelete() {
    setError(undefined);
    if (confirmText.trim() !== CONFIRM_PHRASE) {
      setError(`اكتب "${CONFIRM_PHRASE}" بالضبط للتأكيد.`);
      return;
    }
    if (!password) {
      setError("أدخل كلمة السر لتأكيد هويتك.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password,
    });
    if (signInError) {
      setLoading(false);
      setError("كلمة السر غير صحيحة.");
      return;
    }

    const { error: deleteError } = await deleteMyAccount();
    if (deleteError) {
      setLoading(false);
      setError(deleteError);
      return;
    }

    await unregisterPushToken();
    await supabase.auth.signOut();
    setLoading(false);
    router.replace("/");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
          <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
            <ChevronBackIcon color={t.text} />
          </IconButton>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>حذف الحساب</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Card style={{ padding: 20, gap: 12 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.danger, textAlign: "right" }}>
              هذا الإجراء نهائي ولا يمكن التراجع عنه
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", lineHeight: 20 }}>
              سيُحذف حسابك وكل إعلاناتك وامتيازاتك ومحادثاتك ورسائلك وتقييماتك وطلبات التوثيق نهائيًا، ولن يكون بالإمكان استعادتها.
            </Text>
          </Card>

          <Card style={{ padding: 20, gap: 14 }}>
            <Field
              label="كلمة السر"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              style={{ textAlign: "left" }}
            />
            <Field
              label={`اكتب "${CONFIRM_PHRASE}" للتأكيد`}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={CONFIRM_PHRASE}
              style={{ textAlign: "right" }}
            />
            {error ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right" }}>{error}</Text>
            ) : null}
            <Button label="احذف حسابي نهائيًا" fullWidth loading={loading} onPress={onDelete} variant="danger" />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
