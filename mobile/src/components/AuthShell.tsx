// Mobile take on the website's auth pages (styles/auth.css): soft lavender
// gradient, drifting colour blobs and a frosted card holding the form.
import type { ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "@/theme";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <LinearGradient colors={["#f7f6ff", "#fdfcfb", "#f3f1ff"]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View pointerEvents="none" style={[blob, { top: -80, left: -90, backgroundColor: "#a6a9f7" }]} />
      <View pointerEvents="none" style={[blob, { top: 260, right: -120, backgroundColor: "#888cf8", opacity: 0.22 }]} />
      <View pointerEvents="none" style={[blob, { bottom: -100, left: 10, backgroundColor: "#f0c9ff" }]} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }} keyboardShouldPersistTaps="handled">
            <Image source={require("../../assets/logo.png")} style={{ width: 140, height: 56, alignSelf: "center", marginBottom: 24 }} resizeMode="contain" />
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.72)",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.9)",
                padding: 24,
                shadowColor: "#4c4ea3",
                shadowOpacity: 0.12,
                shadowRadius: 30,
                shadowOffset: { width: 0, height: 16 },
                elevation: 4,
              }}
            >
              <LinearGradient
                colors={["#9498ef", "#b59dff", "#9498ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 4, width: 48, borderRadius: radius.sm, marginBottom: 18 }}
              />
              <Text style={{ fontSize: 26, fontWeight: "700", letterSpacing: -0.5, color: "#16140c" }}>{title}</Text>
              {subtitle ? <Text style={{ fontSize: 14.5, color: "#635f56", marginTop: 6, marginBottom: 22, lineHeight: 21 }}>{subtitle}</Text> : <View style={{ height: 20 }} />}
              {children}
            </View>
            {footer ? <View style={{ marginTop: 20, alignItems: "center" }}>{footer}</View> : null}
            <Text style={{ textAlign: "center", color: colors.slate400, fontSize: 12, marginTop: 24 }}>OASIS · School management, simplified</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const blob = {
  position: "absolute" as const,
  width: 320,
  height: 320,
  borderRadius: 160,
  opacity: 0.35,
};
