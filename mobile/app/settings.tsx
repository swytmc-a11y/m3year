import { useEffect, useState } from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Field, IconButton, Tappable, useToast } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { updateMyProfile } from "@/lib/profile-actions";
import {
  getNotificationPreferences,
  setNotificationPreference,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationPreferences,
} from "@/lib/notification-preferences";
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
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data }, prefs] = await Promise.all([
        supabase.from("profiles").select("full_name, city").eq("id", user.id).maybeSingle(),
        getNotificationPreferences(),
      ]);
      if (active && data) {
        setFullName(data.full_name ?? "");
        setCity(data.city ?? "");
      }
      if (active) setNotifPrefs(prefs);
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

  // Optimistic: the switch moves immediately and rolls back only if the save
  // actually failed, so a toggle never feels laggy on a slow connection.
  async function onToggleNotification(key: keyof NotificationPreferences, value: boolean) {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    const { error: prefError } = await setNotificationPreference(key, value);
    if (prefError) {
      setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
      toast(prefError, "error");
    }
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

          <Card style={{ padding: 20, gap: 4 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: t.text, textAlign: "right" }}>
              الإشعارات
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.textMuted, textAlign: "right", lineHeight: 19, marginBottom: 8 }}>
              اختر ما يصلك من تنبيهات. الإيقاف يسري على الإشعارات داخل التطبيق وإشعارات الجهاز معًا.
            </Text>
            {(Object.keys(NOTIFICATION_CATEGORY_LABELS) as (keyof NotificationPreferences)[]).map((key) => (
              <View
                key={key}
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingVertical: 10,
                  minHeight: 44,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: t.text, textAlign: "right" }}>
                    {NOTIFICATION_CATEGORY_LABELS[key].title}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.textMuted, textAlign: "right", marginTop: 2, lineHeight: 17 }}>
                    {NOTIFICATION_CATEGORY_LABELS[key].description}
                  </Text>
                </View>
                <Switch
                  value={notifPrefs[key]}
                  onValueChange={(v) => onToggleNotification(key, v)}
                  trackColor={{ true: t.primary, false: t.border }}
                />
              </View>
            ))}
          </Card>

          <Card style={{ padding: 4 }}>
            <Tappable onPress={() => router.push("/saved-searches")} haptic="light">
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, minHeight: 44 }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: t.text }}>عمليات البحث المحفوظة</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>عرض</Text>
              </View>
            </Tappable>
            <Tappable onPress={() => router.push("/blocked-users")} haptic="light">
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, minHeight: 44 }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: t.text }}>المستخدمون المحظورون</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>عرض</Text>
              </View>
            </Tappable>
            <Tappable onPress={() => router.push("/report-problem")} haptic="light">
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, minHeight: 44 }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13.5, color: t.text }}>الإبلاغ عن مشكلة</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>عرض</Text>
              </View>
            </Tappable>
          </Card>

          <Button label="حذف الحساب" variant="danger" fullWidth onPress={() => router.push("/delete-account")} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
