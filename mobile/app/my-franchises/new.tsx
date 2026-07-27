import { View, Text, ScrollView } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/ui";
import { FranchiseForm } from "@/components/franchise-form";
import { useAuth } from "@/contexts/auth";
import { createFranchise } from "@/lib/franchises-actions";
import { colors, fonts } from "@/theme";

export default function NewFranchiseScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <TopBar title="امتياز جديد" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.mutedText, textAlign: "right", marginBottom: 20 }}>
          اعرض علامتك التجارية أمام المستثمرين والمشغّلين المحتملين.
        </Text>
        <FranchiseForm
          onSubmit={async (values, intent, extra) => {
            const { error } = await createFranchise(
              extra.franchiseId,
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
    </SafeAreaView>
  );
}
