import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import { findModule } from "@/modules/registry";
import { ModuleSection } from "@/components/ModuleSection";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Glass } from "@/components/glass";
import { TAB_BAR_SPACE } from "@/components/GlassTabBar";
import { PortalScreen } from "./PortalScreens";
import { AnalyticsScreen, ReportingScreen } from "./InsightScreens";
import { colors } from "@/theme";

/** One module's screen: header, section switcher, live sections. Shared by
 * the Modules stack and the Students tab. */
export function ModuleView({
  slug,
  topInset = 8,
  showBreadcrumb = true,
  showBack = false,
}: {
  slug: string;
  topInset?: number;
  showBreadcrumb?: boolean;
  /** Round glass back button (module screens inside the More stack). */
  showBack?: boolean;
}) {
  const mod = findModule(slug);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState(0);
  const [autoAddSignal, setAutoAddSignal] = useState(0);
  const { add } = useLocalSearchParams<{ add?: string }>();

  // Quick actions link here with ?add=1 to open the first section's Add form.
  useEffect(() => {
    if (add === "1") {
      setActive(0);
      setAutoAddSignal((n) => n + 1);
      router.setParams({ add: undefined });
    }
  }, [add]);

  if (!mod) {
    return (
      <View style={{ padding: 20 }}>
        <Card>
          <EmptyState icon="help-circle" title="Module not found" />
        </Card>
      </View>
    );
  }

  const tabbed = mod.kind === "crud" && mod.sections.length > 2;
  const sections = mod.kind === "crud" ? (tabbed ? [mod.sections[active]] : mod.sections) : [];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, paddingTop: topInset, paddingBottom: TAB_BAR_SPACE + 24 }}
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
      {showBack && (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.navigate("/modules"))}
          accessibilityLabel="Back"
          style={({ pressed }) => ({ alignSelf: "flex-start", marginBottom: 14, transform: [{ scale: pressed ? 0.92 : 1 }] })}
        >
          <Glass radius={22} interactive style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Feather name="chevron-left" size={22} color={colors.slate700} />
          </Glass>
        </Pressable>
      )}
      <PageHeader title={mod.label} description={mod.description} breadcrumb={showBreadcrumb ? mod.label : undefined} />

      {tabbed && mod.kind === "crud" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {mod.sections.map((sec, i) => {
            const on = i === active;
            return (
              <Pressable key={sec.table} onPress={() => setActive(i)}>
                <Glass radius={999} interactive tint={on ? colors.oasis500 : undefined} style={{ paddingHorizontal: 15, paddingVertical: 9, backgroundColor: on ? "rgba(148,152,239,0.22)" : undefined }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: on ? colors.oasis800 : colors.slate600 }}>{sec.title}</Text>
                </Glass>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {mod.kind === "crud" &&
        sections.map((sec, i) => (
          <ModuleSection
            key={sec.table}
            section={sec}
            showTitle={tabbed || mod.sections.length > 1}
            refreshSignal={refreshSignal}
            autoAddSignal={i === 0 ? autoAddSignal : 0}
          />
        ))}

      {mod.slug === "parents-portal" && <PortalScreen kind="parent" refreshSignal={refreshSignal} />}
      {mod.slug === "student-portal" && <PortalScreen kind="student" refreshSignal={refreshSignal} />}
      {mod.slug === "reporting" && <ReportingScreen refreshSignal={refreshSignal} />}
      {mod.slug === "school-analytics" && <AnalyticsScreen refreshSignal={refreshSignal} />}
      {mod.slug === "ai-features" && (
        <Card>
          <EmptyState icon="zap" title="Coming later" description="No LLM provider or approach has been chosen yet - this will be scoped separately once that decision is made." />
        </Card>
      )}
    </ScrollView>
  );
}
