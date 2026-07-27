import { View, Text, ScrollView } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { ListingForm } from "@/components/listing-form";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { createListing } from "@/lib/listings-actions";
import { fonts } from "@/theme";

export default function NewListingScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { session, loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }
  if (!session) {
    return <Redirect href="/auth" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 10 }}>
        <IconButton accessibilityLabel="رجوع" onPress={() => router.back()}>
          <ChevronBackIcon color={t.text} />
        </IconButton>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>إعلان جديد</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.textMuted, textAlign: "right", marginBottom: 20 }}>
          اعرض مشروعك أمام الشركاء الممولين المحتملين.
        </Text>
        <ListingForm
          onSubmit={async (values, intent, extra) => {
            const { error } = await createListing(extra.listingId, values, intent, extra.photoUrls);
            if (error) throw new Error(error);
            router.replace("/my-ads");
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
