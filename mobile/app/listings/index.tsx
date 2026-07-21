import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Switch,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar, Chip } from "@/components/ui";
import { ListingCard } from "@/components/listings";
import { supabase } from "@/lib/supabase";
import {
  SECTOR_OPTIONS,
  type Listing,
  type BusinessSector,
} from "@/lib/constants";
import { colors, fonts } from "@/theme";

export default function ListingsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<BusinessSector | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    let query = supabase
      .from("listings")
      .select("*")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (sector) query = query.eq("sector", sector);
    if (verifiedOnly) query = query.eq("verification_status", "verified");
    const q = search.trim();
    if (q) query = query.ilike("title", `%${q}%`);

    const { data, error: qError } = await query;
    if (qError) {
      console.error("[listings] load failed", qError);
      setError(true);
      setListings(null);
    } else {
      setListings(data);
    }
    setLoading(false);
  }, [sector, verifiedOnly, search]);

  // Debounce so typing in search doesn't fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.paper }}
      edges={["top"]}
    >
      <TopBar title="تصفّح المشاريع" onBack={() => router.back()} />

      <FlatList
        data={listings ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث بعنوان المشروع"
              placeholderTextColor={colors.mutedText}
              style={{
                height: 46,
                borderWidth: 1,
                borderColor: colors.grid,
                borderRadius: 10,
                backgroundColor: colors.white,
                paddingHorizontal: 16,
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.ink,
                textAlign: "right",
              }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}
            >
              <Chip
                label="الكل"
                active={sector === null}
                onPress={() => setSector(null)}
              />
              {SECTOR_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={sector === opt.value}
                  onPress={() => setSector(opt.value)}
                />
              ))}
            </ScrollView>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Switch
                value={verifiedOnly}
                onValueChange={setVerifiedOnly}
                trackColor={{ true: colors.verify, false: colors.grid }}
              />
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 14,
                  color: colors.subtleText,
                }}
              >
                الموثّقة فقط
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : error ? (
            <EmptyBox text="تعذّر تحميل المشاريع الآن. حاول مرة أخرى." />
          ) : (
            <EmptyBox text="لا توجد مشاريع منشورة تطابق بحثك بعد." />
          )
        }
      />
    </SafeAreaView>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderColor: colors.grid,
        borderWidth: 1,
        borderRadius: 12,
        padding: 40,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.mutedText,
          textAlign: "center",
        }}
      >
        {text}
      </Text>
    </View>
  );
}
