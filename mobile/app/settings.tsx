import { useEffect, useState } from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, IconButton, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { updateMyProfile } from "@/lib/profile-actions";
import { fonts } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { t, isDark, toggleDark } = useTheme();
  const toast = useToast();
  const { session, user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, city")
        .eq("id", user.id)
        .maybeSingle();
      if (active && data) {
        setFullName(data.full_name ?? "");
        setCity(data.city ?? "");
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  async function onSave() {
    setError(undefined);
    if (fullName.trim().length < 2) {
      setError("أدخل اسمًا صحيحًا.");
      return;
    }
    setSaving(true);
    const { error: saveError } = await updateMyProfile({
      fullName: fullName.trim(),
      city: city.trim(),
    });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    toast("تم حفظ التعديلات.", "success");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>الإعدادات</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, backgroundColor: t.bg }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
          <Card style={{ padding: 20, gap: 16 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
              بيانات الحساب
            </Text>
            <Field label="الاسم الكامل" value={fullName} onChangeText={setFullName} placeholder="اسمك" maxLength={80} textAlign="right" />
            <Field label="المدينة" value={city} onChangeText={setCity} placeholder="مدينتك" maxLength={60} textAlign="right" />
            {user?.email ? (
              <View style={{ gap: 6 }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text, textAlign: "right" }}>البريد الإلكتروني</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right" }}>{user.email}</Text>
              </View>
            ) : null}
            {error ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right" }}>{error}</Text>
            ) : null}
            <Button label="حفظ التعديلات" fullWidth loading={saving} onPress={onSave} />
          </Card>

          <Card style={{ padding: 4 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, minHeight: 44 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: t.text }}>الوضع الغامق</Text>
              <Switch value={isDark} onValueChange={toggleDark} trackColor={{ true: t.primary, false: t.border }} />
            </View>
          </Card>

          <Button label="حذف الحساب" variant="danger" fullWidth onPress={() => router.push("/delete-account")} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
