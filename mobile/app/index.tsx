import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { Spinner } from "@/components/ui";
import { AuthShell } from "@/components/AuthShell";
import { colors } from "@/theme";

export default function Index() {
  const { user, loading } = useAuth();

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

  if (loading) return <Spinner />;
  return <Redirect href={user ? "/(tabs)" : "/login"} />;
}
