import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { findModule } from "@/modules/registry";
import { ModuleSection } from "@/components/ModuleSection";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { PortalScreen } from "@/screens/PortalScreens";
import { ReportingScreen, AnalyticsScreen } from "@/screens/InsightScreens";
import { colors } from "@/theme";

export default function ModuleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const mod = findModule(String(slug));
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState(0);

  if (!mod) {
    return (
      <View style={{ padding: 20 }}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Card>
          <EmptyState icon="help-circle" title="Module not found" />
        </Card>
      </View>
    );
  }

  const tabbed = mod.kind === "crud" && mod.sections.length > 2;
  const sections = mod.kind === "crud" ? (tabbed ? [mod.sections[active]] : mod.sections) : [];

  return (
    <>
      <Stack.Screen options={{ title: mod.label }} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.oasis500}
            onRefresh={() => {
              setRefreshing(true);
              setRefreshSignal((n) => n + 1);
              setTimeout(() => setRefreshing(false), 600);
            }}
          />
        }
      >
        <PageHeader title={mod.label} description={mod.description} breadcrumb={mod.label} />

        {tabbed && mod.kind === "crud" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {mod.sections.map((sec, i) => {
              const on = i === active;
              return (
                <Pressable
                  key={sec.table}
                  onPress={() => setActive(i)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: on ? colors.oasis200 : colors.slate200,
                    backgroundColor: on ? colors.oasis50 : "#fff",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: on ? colors.oasis700 : colors.slate500 }}>{sec.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {mod.kind === "crud" &&
          sections.map((sec) => (
            <ModuleSection key={sec.table} section={sec} showTitle={tabbed || mod.sections.length > 1} refreshSignal={refreshSignal} />
          ))}

        {mod.slug === "parents-portal" && <PortalScreen kind="parent" refreshSignal={refreshSignal} />}
        {mod.slug === "student-portal" && <PortalScreen kind="student" refreshSignal={refreshSignal} />}
        {mod.slug === "reporting" && <ReportingScreen refreshSignal={refreshSignal} />}
        {mod.slug === "school-analytics" && <AnalyticsScreen refreshSignal={refreshSignal} />}
        {mod.slug === "ai-features" && (
          <Card style={{ borderStyle: "dashed", backgroundColor: "rgba(248,250,252,0.6)" }}>
            <EmptyState
              icon="zap"
              title="Coming later"
              description="No LLM provider or approach has been chosen yet - this will be scoped separately once that decision is made."
            />
          </Card>
        )}
      </ScrollView>
    </>
  );
}
