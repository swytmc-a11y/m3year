import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "@/components/kit";
import { ChevronBackIcon } from "@/components/icons";
import { StatusBadge } from "@/components/listings";
import { ListingForm } from "@/components/listing-form";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { supabase } from "@/lib/supabase";
import { updateListing } from "@/lib/listings-actions";
import type { Listing, ListingConfidential } from "@/lib/constants";
import { fonts, radius } from "@/theme";

export default function EditListingScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [confidential, setConfidential] = useState<ListingConfidential | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data }, { data: confidentialData }] = await Promise.all([
        supabase.from("listings").select("*").eq("id", String(id)).maybeSingle(),
        supabase.from("listing_confidential").select("*").eq("listing_id", String(id)).maybeSingle(),
      ]);
      if (active) {
        setListing(data);
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
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: t.text }}>تعديل الإعلان</Text>
        </View>
        {listing ? <StatusBadge status={listing.status} /> : null}
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={t.text} />
        </View>
      ) : !listing ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: t.textMuted }}>الإعلان غير موجود.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18 }}>
          {listing.status === "rejected" && listing.rejection_reason ? (
            <View style={{ backgroundColor: t.dangerTint, borderRadius: radius.lg, padding: 14, marginBottom: 20 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: t.danger, textAlign: "right" }}>
                <Text style={{ fontFamily: fonts.bodyBold }}>سبب الرفض: </Text>
                {listing.rejection_reason}
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: t.textMuted, textAlign: "right", marginBottom: 20 }}>
              أي تعديل على إعلان منشور يعيده لقائمة المراجعة قبل إعادة نشره.
            </Text>
          )}
          <ListingForm
            listing={listing}
            confidential={confidential ?? undefined}
            onSubmit={async (values, intent, extra) => {
              const { error } = await updateListing(listing.id, values, intent, extra.photoUrls);
              if (error) throw new Error(error);
              router.replace("/my-ads");
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
