import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./Text";
import { Glass } from "./glass";
import { colors } from "@/theme";

/** Chrome for the developer console screens (no tab bar). */
export function PlatformScreen({
  title,
  description,
  back = true,
  action,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  description?: string;
  back?: boolean;
  action?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, minHeight: 44 }}>
            {back && (
              <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/platform"))} accessibilityLabel="Back">
                <Glass radius={22} interactive style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="chevron-left" size={22} color={colors.slate700} />
                </Glass>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            {action}
          </View>
          <Text style={{ fontSize: 28, fontWeight: "700", letterSpacing: -0.6, color: colors.slate900 }}>{title}</Text>
          {description ? <Text style={{ fontSize: 14.5, color: colors.slate500, marginTop: 6, lineHeight: 21 }}>{description}</Text> : null}
          <View style={{ height: 18 }} />
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Segments<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? colors.oasis500 : "rgba(255,255,255,0.8)", borderWidth: on ? 0 : 1, borderColor: colors.slate200 }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: "600", color: on ? "#fff" : colors.slate600 }}>
              {o.label}
              {o.count !== undefined ? <Text style={{ color: on ? "rgba(255,255,255,0.75)" : colors.slate400 }}> {o.count}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ListRow({ children, first, onPress }: { children: ReactNode; first?: boolean; onPress?: () => void }) {
  const style = [
    { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
    !first && { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" },
  ];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && { backgroundColor: "rgba(148,152,239,0.08)" }]}>
      {children}
    </Pressable>
  );
}
