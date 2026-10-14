import { Platform } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/theme";
import { FONT_REGULAR } from "@/components/Text";

export default function ModulesStack() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "transparent" },
        headerTintColor: colors.oasis600,
        headerTitleStyle: { color: colors.slate900, fontFamily: FONT_REGULAR, fontSize: 17 },
        headerBackTitleStyle: { fontFamily: FONT_REGULAR },
        headerShadowVisible: false,
        headerBackTitle: "Modules",
        // iOS: frosted system-material header over the content, like Settings.
        ...(Platform.OS === "ios"
          ? { headerTransparent: true, headerBlurEffect: "systemChromeMaterialLight" as const }
          : { headerStyle: { backgroundColor: "#f6f5ff" } }),
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[slug]" options={{ title: "" }} />
    </Stack>
  );
}
