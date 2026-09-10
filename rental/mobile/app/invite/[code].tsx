import { useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { rememberReferralCode } from "@/lib/referral-link";
import { useTheme } from "@/contexts/theme";

/**
 * Where an invite link lands.
 *
 * It only parks the code and steps aside: the credit is granted by the
 * activation that runs once there is a signed-in account, which may be
 * several screens later — or on the next launch, if they sign up then.
 */
export default function InviteLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { t } = useTheme();

  useEffect(() => {
    (async () => {
      if (code) await rememberReferralCode(code);
      router.replace("/invite");
    })();
  }, [code, router]);

  return <View style={{ flex: 1, backgroundColor: t.bg }} />;
}
