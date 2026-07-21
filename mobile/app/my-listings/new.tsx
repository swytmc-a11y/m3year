import { View, Text, ScrollView } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/ui";
import { ListingForm } from "@/components/listing-form";
import { useAuth } from "@/contexts/auth";
import { createListing } from "@/lib/listings-actions";
import { colors, fonts } from "@/theme";

export default function NewListingScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.paper }}
      edges={["top"]}
    >
      <TopBar title="إعلان جديد" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.mutedText,
            textAlign: "right",
            marginBottom: 20,
          }}
        >
          اعرض مشروعك أمام الشركاء الممولين المحتملين.
        </Text>
        <ListingForm
          onSubmit={async (values, intent) => {
            const { error } = await createListing(values, intent);
            if (error) throw new Error(error);
            router.replace("/my-listings");
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
