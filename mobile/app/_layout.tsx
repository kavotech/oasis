import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaInsetsContext, SafeAreaProvider } from "react-native-safe-area-context";
import { screenshotInsets } from "@/lib/screenshot";
import { AuthProvider } from "@/lib/auth";
import { FONT_ITALIC, FONT_REGULAR } from "@/components/Text";
import { colors } from "@/theme";

// Hold the splash until Grenette Pro is loaded so text never flashes in the
// system font.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [FONT_REGULAR]: require("../assets/fonts/GrenettePro-Regular.ttf"),
    [FONT_ITALIC]: require("../assets/fonts/GrenettePro-Italic.ttf"),
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  const app = (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </AuthProvider>
  );

  return (
    <SafeAreaProvider>
      {screenshotInsets ? <SafeAreaInsetsContext.Provider value={screenshotInsets}>{app}</SafeAreaInsetsContext.Provider> : app}
    </SafeAreaProvider>
  );
}
