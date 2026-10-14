import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.oasis600,
            headerTitleStyle: { color: colors.slate900, fontWeight: "600" },
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="module/[slug]" options={{ headerShown: true, headerBackTitle: "Back" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
