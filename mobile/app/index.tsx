import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "@/components/Text";
import { useAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import { AuthShell } from "@/components/AuthShell";
import { colors } from "@/theme";
import { WELCOME_SEEN_KEY } from "./welcome";

/** Entry gate: welcome slides on first launch, then sign-in, the approval
 * screen for schools still under review, or the dashboard. */
export default function Index() {
  const { user, role, schoolStatus, loading } = useAuth();
  const [seenWelcome, setSeenWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY)
      .then((v) => setSeenWelcome(v === "1"))
      .catch(() => setSeenWelcome(true));
  }, []);

  if (!supabaseConfigured) {
    return (
      <AuthShell title="Almost there" subtitle="This build doesn't know which OASIS server to talk to yet.">
        <View style={{ backgroundColor: colors.oasis50, borderRadius: 12, padding: 14 }}>
          <Text style={{ color: colors.oasis800, fontSize: 13.5, lineHeight: 20 }}>
            Copy mobile/.env.example to mobile/.env, set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (the same values as the website),
            then restart with npx expo start --clear.
          </Text>
        </View>
      </AuthShell>
    );
  }

  if (loading || seenWelcome === null) return <Spinner />;
  if (!user) return <Redirect href={seenWelcome ? "/login" : "/welcome"} />;
  if (role === "super_admin") return <Redirect href="/platform" />;
  if (role === "school_admin" && schoolStatus && schoolStatus !== "approved") return <Redirect href="/pending" />;
  return <Redirect href="/(tabs)" />;
}
