import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/ui";
import { StatusBadge } from "@/components/listings";
import { ListingForm } from "@/components/listing-form";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";
import { updateListing } from "@/lib/listings-actions";
import type { Listing } from "@/lib/constants";
import { colors, fonts, radius } from "@/theme";

export default function EditListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("id", String(id))
        .maybeSingle();
      if (active) {
        setListing(data);
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.paper }}
      edges={["top"]}
    >
      <TopBar
        title="تعديل الإعلان"
        onBack={() => router.back()}
        right={listing ? <StatusBadge status={listing.status} /> : undefined}
      />
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : !listing ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.mutedText,
            }}
          >
            الإعلان غير موجود.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {listing.status === "rejected" && listing.rejection_reason ? (
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
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: colors.danger,
                  textAlign: "right",
                }}
              >
                <Text style={{ fontFamily: fonts.bodyBold }}>سبب الرفض: </Text>
                {listing.rejection_reason}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.mutedText,
                textAlign: "right",
                marginBottom: 20,
              }}
            >
              أي تعديل على إعلان منشور يعيده لقائمة المراجعة قبل إعادة نشره.
            </Text>
          )}
          <ListingForm
            listing={listing}
            onSubmit={async (values, intent) => {
              const { error } = await updateListing(listing.id, values, intent);
              if (error) throw new Error(error);
              router.replace("/my-listings");
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
