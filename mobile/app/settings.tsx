import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, Button, Field, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { updateMyProfile } from "@/lib/profile-actions";
import { colors, fonts } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { session, user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

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
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  async function onSave() {
    setError(undefined);
    setSaved(false);
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
    setSaved(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title="الإعدادات" onBack={() => router.back()} />
      {loading ? (
        <View style={{ flex: 1, backgroundColor: colors.paper }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Card style={{ gap: 16 }}>
            <Text
              style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink, textAlign: "right" }}
            >
              بيانات الحساب
            </Text>
            <Field
              label="الاسم الكامل"
              value={fullName}
              onChangeText={setFullName}
              placeholder="اسمك"
              maxLength={80}
              textAlign="right"
            />
            <Field
              label="المدينة"
              value={city}
              onChangeText={setCity}
              placeholder="مدينتك"
              maxLength={60}
              textAlign="right"
            />
            {user?.email ? (
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 14,
                    color: colors.ink,
                    textAlign: "right",
                  }}
                >
                  البريد الإلكتروني
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.mutedText,
                    textAlign: "right",
                  }}
                >
                  {user.email}
                </Text>
              </View>
            ) : null}
            {error ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.amber, textAlign: "right" }}>
                {error}
              </Text>
            ) : null}
            {saved ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.verify, textAlign: "right" }}>
                تم حفظ التعديلات.
              </Text>
            ) : null}
            <Button label="حفظ التعديلات" fullWidth loading={saving} onPress={onSave} />
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
