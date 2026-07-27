import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { StatusBadge } from "@/components/listings";
import { FranchiseForm } from "@/components/franchise-form";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { updateFranchise } from "@/lib/franchises-actions";
import type { Franchise, FranchiseConfidential } from "@/lib/franchise-constants";
import { fonts, radius } from "@/theme";

export default function EditFranchiseScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [confidential, setConfidential] = useState<FranchiseConfidential | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data }, { data: confidentialData }] = await Promise.all([
        supabase.from("franchises").select("*").eq("id", String(id)).maybeSingle(),
        supabase.from("franchise_confidential").select("*").eq("franchise_id", String(id)).maybeSingle(),
      ]);
      if (active) {
        setFranchise(data);
        setConfidential(confidentialData);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 10 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
          <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
            <ChevronBackIcon color={t.text} />
          </IconButton>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>تعديل الامتياز</Text>
        </View>
        {franchise ? <StatusBadge status={franchise.status} /> : null}
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={t.text} />
        </View>
      ) : !franchise ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted }}>الامتياز غير موجود.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18 }}>
          {franchise.status === "rejected" && franchise.rejection_reason ? (
            <View style={{ backgroundColor: t.dangerTint, borderRadius: radius.lg, padding: 14, marginBottom: 20 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right" }}>
                <Text style={{ fontFamily: fonts.bodyBold }}>سبب الرفض: </Text>
                {franchise.rejection_reason}
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", marginBottom: 20 }}>
              أي تعديل على امتياز منشور يعيده لقائمة المراجعة قبل إعادة نشره.
            </Text>
          )}
          <FranchiseForm
            franchise={franchise}
            confidential={confidential ?? undefined}
            onSubmit={async (values, intent, extra) => {
              const { error } = await updateFranchise(franchise.id, values, intent, extra.logoUrl, extra.photoUrls);
              if (error) throw new Error(error);
              router.replace("/my-ads?kind=franchises");
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
