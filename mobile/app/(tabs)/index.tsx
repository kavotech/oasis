import { useCallback, useState } from "react";
import { Image, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ROLE_LABELS, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Avatar, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { ModuleGrid } from "@/components/ModuleGrid";
import { colors } from "@/theme";

type Stats = { students: number; staff: number; presentToday: number; outstanding: number };

export default function Dashboard() {
  const { user, profile, role } = useAuth();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checklistKey, setChecklistKey] = useState(0);

  const load = useCallback(async () => {
    if (!profile?.school_id) return;
    const today = new Date().toISOString().slice(0, 10);
    const [school, students, staff, present, unpaid] = await Promise.all([
      supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle(),
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("staff").select("id", { count: "exact", head: true }),
      supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("date", today).eq("status", "present"),
      supabase.from("fee_invoices").select("id", { count: "exact", head: true }).neq("status", "paid"),
    ]);
    setSchoolName(school.data?.name ?? null);
    setStats({ students: students.count ?? 0, staff: staff.count ?? 0, presentToday: present.count ?? 0, outstanding: unpaid.count ?? 0 });
  }, [profile?.school_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const displayName = profile?.full_name || user?.email || "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 10 }}>
        <Image source={require("../../assets/logo.png")} style={{ width: 92, height: 32 }} resizeMode="contain" />
        <Text style={{ flex: 1, fontSize: 12, color: colors.slate400 }} numberOfLines={1}>
          {schoolName ?? ""}
        </Text>
        <Avatar name={displayName} size={34} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.oasis500}
            onRefresh={async () => {
              setRefreshing(true);
              setChecklistKey((k) => k + 1);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <PageHeader title={`Welcome, ${displayName.split(" ")[0] || displayName}`} description={role ? ROLE_LABELS[role] : undefined} />

        {!profile?.school_id ? (
          <Card style={{ marginBottom: 20, borderStyle: "dashed", backgroundColor: "rgba(248,250,252,0.6)" }}>
            <EmptyState
              icon="home"
              title="Not linked to a school yet"
              description="Your account isn't attached to a school, so the modules below won't show any data until that's set up."
            />
          </Card>
        ) : (
          <>
            {role === "school_admin" && <OnboardingChecklist key={checklistKey} />}
            {stats && role !== "parent" && role !== "student" && (
              <View style={{ gap: 12, marginBottom: 24 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <StatCard label="Students" value={stats.students.toLocaleString()} icon="users" accent="oasis" />
                  <StatCard label="Staff" value={stats.staff.toLocaleString()} icon="briefcase" accent="sky" />
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <StatCard label="Present today" value={stats.presentToday.toLocaleString()} icon="check-square" accent="emerald" />
                  <StatCard label="Unpaid invoices" value={stats.outstanding.toLocaleString()} icon="credit-card" accent="amber" />
                </View>
              </View>
            )}
          </>
        )}

        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.slate800, marginBottom: 12 }}>Modules</Text>
        <ModuleGrid />
      </ScrollView>
    </SafeAreaView>
  );
}
