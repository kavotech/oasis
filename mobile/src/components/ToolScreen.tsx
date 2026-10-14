import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme";
import { Glass } from "./glass";
import { TAB_BAR_SPACE } from "./GlassTabBar";
import { PageHeader } from "./ui";

/** Chrome for the bulk tools: glass back button, title, scrolling body and an
 * optional action bar that floats just above the tab bar. */
export function ToolScreen({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: TAB_BAR_SPACE + (footer ? 96 : 24) }}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton />
          <PageHeader title={title} description={description} />
          {children}
        </ScrollView>
        {footer ? (
          <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: TAB_BAR_SPACE + 4 }}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function BackButton() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.navigate("/modules"))}
      accessibilityLabel="Back"
      style={({ pressed }) => ({ alignSelf: "flex-start", marginBottom: 14, transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <Glass radius={22} interactive style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Feather name="chevron-left" size={22} color={colors.slate700} />
      </Glass>
    </Pressable>
  );
}

export type ClassOption = { id: string; name: string };
export type StreamOption = { id: string; name: string; class_id: string };

/** Classes and streams for the class pickers in the bulk tools. */
export function useClasses() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [streams, setStreams] = useState<StreamOption[]>([]);
  useEffect(() => {
    supabase
      .from("classes")
      .select("id, name")
      .order("name")
      .then(({ data }) => setClasses((data as ClassOption[]) ?? []));
    supabase
      .from("streams")
      .select("id, name, class_id")
      .order("name")
      .then(({ data }) => setStreams((data as StreamOption[]) ?? []));
  }, []);
  return { classes, streams };
}
