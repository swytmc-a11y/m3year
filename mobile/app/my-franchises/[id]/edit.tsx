import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/ui";
import { StatusBadge } from "@/components/listings";
import { FranchiseForm } from "@/components/franchise-form";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { updateFranchise } from "@/lib/franchises-actions";
import type { Franchise, FranchiseConfidential } from "@/lib/franchise-constants";
import { colors, fonts, radius } from "@/theme";

export default function EditFranchiseScreen() {
  const router = useRouter();
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
        supabase
          .from("franchise_confidential")
          .select("*")
          .eq("franchise_id", String(id))
          .maybeSingle(),
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
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar
        title="تعديل الامتياز"
        onBack={() => router.back()}
        right={franchise ? <StatusBadge status={franchise.status} /> : undefined}
      />
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : !franchise ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.mutedText }}>
            الامتياز غير موجود.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {franchise.status === "rejected" && franchise.rejection_reason ? (
            <View
              style={{
                backgroundColor: colors.dangerBg,
                borderColor: "#F3B0AB",
                borderWidth: 1,
                borderRadius: radius.md,
                padding: 14,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.danger, textAlign: "right" }}>
                <Text style={{ fontFamily: fonts.bodyBold }}>سبب الرفض: </Text>
                {franchise.rejection_reason}
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mutedText, textAlign: "right", marginBottom: 20 }}>
              أي تعديل على امتياز منشور يعيده لقائمة المراجعة قبل إعادة نشره.
            </Text>
          )}
          <FranchiseForm
            franchise={franchise}
            confidential={confidential ?? undefined}
            onSubmit={async (values, intent, extra) => {
              const { error } = await updateFranchise(
                franchise.id,
                values,
                intent,
                extra.logoUrl,
                extra.photoUrls,
              );
              if (error) throw new Error(error);
              router.replace("/my-franchises");
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
