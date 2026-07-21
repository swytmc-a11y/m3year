import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/logo";
import { Caliper } from "@/components/caliper";
import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/auth";
import { colors, fonts } from "@/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: colors.white,
            borderBottomWidth: 1,
            borderBottomColor: colors.grid,
          }}
        >
          <Logo size={24} />
          <Button
            label={session ? "لوحتي" : "ابدأ الآن"}
            variant="primary"
            onPress={() => router.push(session ? "/dashboard" : "/auth")}
          />
        </View>

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 56,
            gap: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: 12,
                letterSpacing: 2,
                color: colors.verify,
              }}
            >
              MIYAR — دقّة قبل الثقة
            </Text>
          </View>

          <Text
            style={{
              fontFamily: fonts.heading,
              fontSize: 34,
              lineHeight: 46,
              color: colors.ink,
              textAlign: "center",
            }}
          >
            قبل ما تشارك حد في مشروعك،{" "}
            <Text style={{ color: colors.verify }}>تأكد من أرقامه</Text>
          </Text>

          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 16,
              lineHeight: 28,
              color: colors.subtleText,
              textAlign: "center",
              maxWidth: 360,
            }}
          >
            معيار توثّق الإيرادات الفعلية لمشروعك عبر شبكة محاسبين مستقلين،
            لترفع مصداقية عرضك أمام أي شريك ممول محتمل.
          </Text>

          <View style={{ gap: 12, alignSelf: "stretch", marginTop: 8 }}>
            <Button
              label="وثّق مشروعك"
              fullWidth
              onPress={() => router.push(session ? "/dashboard" : "/auth")}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Caliper color={colors.verify} size={14} />
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 13,
                  color: colors.mutedText,
                }}
              >
                تصفّح المشاريع الموثّقة (قريبًا)
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 24,
            backgroundColor: colors.white,
            borderTopWidth: 1,
            borderTopColor: colors.grid,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              color: colors.mutedText,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            معيار — منصة إعلانات وتواصل وتوثيق مالي. لا تُنفّذ المنصة أي صفقة
            تمويل أو نقل ملكية.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
