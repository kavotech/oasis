import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ROLE_LABELS, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Avatar, Badge, Button, Card, EmptyState, StatCard } from "@/components/ui";
import { Glass } from "@/components/glass";
import { AttendanceRing } from "@/components/AttendanceRing";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { QUICK_ACTIONS, TAB_BAR_SPACE } from "@/components/GlassTabBar";
import { colors } from "@/theme";

type Overview = {
  schoolName: string | null;
  students: number;
  staff: number;
  classes: number;
  today: { present: number; absent: number; late: number; excused: number };
  fees: { collected: number; outstanding: number; overdueCount: number };
  events: { id: string; title: string; event_date: string; event_type: string | null }[];
  behaviour: { id: string; type: string; description: string; points: number | null; student: string }[];
};

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const money = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n));

export default function Home() {
  const { user, profile, role } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checklistKey, setChecklistKey] = useState(0);
  const staffView = role !== "parent" && role !== "student";

  const load = useCallback(async () => {
    if (!profile?.school_id) return;
    const today = localToday();
    const count = (t: "students" | "staff" | "classes") => supabase.from(t).select("id", { count: "exact", head: true });
    const [school, students, staff, classes, attendance, invoices, events, behaviour] = await Promise.all([
      supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle(),
      count("students"),
      count("staff"),
      count("classes"),
      supabase.from("attendance_records").select("status").eq("date", today),
      supabase.from("fee_invoices").select("amount, status"),
      supabase.from("calendar_events").select("id, title, event_date, event_type").gte("event_date", today).order("event_date").limit(3),
      supabase.from("behaviour_incidents").select("id, type, description, points, student_id").order("created_at", { ascending: false }).limit(3),
    ]);

    const ids = Array.from(new Set((behaviour.data ?? []).map((b) => b.student_id)));
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: rows } = await supabase.from("students").select("id, full_name").in("id", ids);
      rows?.forEach((r) => names.set(r.id, r.full_name));
    }

    const t = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const a of attendance.data ?? []) if (a.status in t) t[a.status as keyof typeof t]++;
    const fees = { collected: 0, outstanding: 0, overdueCount: 0 };
    for (const i of invoices.data ?? []) {
      if (i.status === "paid") fees.collected += Number(i.amount);
      else fees.outstanding += Number(i.amount);
      if (i.status === "overdue") fees.overdueCount++;
    }

    setData({
      schoolName: school.data?.name ?? null,
      students: students.count ?? 0,
      staff: staff.count ?? 0,
      classes: classes.count ?? 0,
      today: t,
      fees,
      events: events.data ?? [],
      behaviour: (behaviour.data ?? []).map((b) => ({ ...b, student: names.get(b.student_id) ?? "Student" })),
    });
  }, [profile?.school_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const name = profile?.full_name || user?.email || "";
  const firstName = name.split(" ")[0] || name;
  const marked = data ? data.today.present + data.today.absent + data.today.late + data.today.excused : 0;
  const pct = marked && data ? Math.round(((data.today.present + data.today.late) / marked) * 100) : 0;
  const feeTotal = data ? data.fees.collected + data.fees.outstanding : 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: TAB_BAR_SPACE + 24 }}
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
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <Pressable onPress={() => router.push("/account")} accessibilityLabel="Account">
            <Avatar name={name} size={46} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: colors.slate500, fontWeight: "500" }}>{greeting()}</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", letterSpacing: -0.5, color: colors.slate900 }} numberOfLines={1}>
              {firstName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.slate500 }} numberOfLines={1}>
              {data?.schoolName ?? (role ? ROLE_LABELS[role] : "")}
            </Text>
          </View>
          <RoundButton icon="search" label="Search modules" onPress={() => router.push("/modules")} />
          <RoundButton icon="settings" label="Account" onPress={() => router.push("/account")} />
        </View>

        {!profile?.school_id ? (
          <Card>
            <EmptyState
              icon="home"
              title="Not linked to a school yet"
              description="Your account isn't attached to a school, so there's no data to show until that's set up."
            />
          </Card>
        ) : (
          <>
            {/* Quick actions - round, WhatsApp-style */}
            {staffView && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 22 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                {QUICK_ACTIONS.map((a) => (
                  <Pressable key={a.label} onPress={() => router.push(a.href as never)} style={({ pressed }) => ({ alignItems: "center", width: 70, transform: [{ scale: pressed ? 0.93 : 1 }] })}>
                    <Glass radius={30} interactive style={{ width: 60, height: 60, alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: a.color + "1f", alignItems: "center", justifyContent: "center" }}>
                        <Feather name={a.icon} size={20} color={a.color} />
                      </View>
                    </Glass>
                    <Text style={{ fontSize: 11.5, fontWeight: "600", color: colors.slate700, marginTop: 7, textAlign: "center" }} numberOfLines={2}>
                      {a.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {role === "school_admin" && <OnboardingChecklist key={checklistKey} />}

            {staffView && data && (
              <>
                {/* Today */}
                <SectionHeader title="Today" action="Attendance" onAction={() => router.push("/attendance")} />
                <Card style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                    <AttendanceRing
                      centerLabel={marked ? `${pct}%` : "—"}
                      centerSub={marked ? "in school" : "not marked"}
                      segments={[
                        { value: data.today.present, color: "#10b981" },
                        { value: data.today.late, color: "#f59e0b" },
                        { value: data.today.excused, color: colors.oasis500 },
                        { value: data.today.absent, color: "#f43f5e" },
                      ]}
                    />
                    <View style={{ flex: 1, gap: 9 }}>
                      <Legend color="#10b981" label="Present" value={data.today.present} />
                      <Legend color="#f59e0b" label="Late" value={data.today.late} />
                      <Legend color={colors.oasis500} label="Excused" value={data.today.excused} />
                      <Legend color="#f43f5e" label="Absent" value={data.today.absent} />
                    </View>
                  </View>
                  {marked < data.students && (
                    <Button variant="secondary" icon="check-circle" style={{ marginTop: 16 }} onPress={() => router.push("/attendance?add=1")}>
                      {marked ? `${data.students - marked} still to mark` : "Take today's attendance"}
                    </Button>
                  )}
                </Card>

                {/* Overview */}
                <SectionHeader title="Overview" action="Reports" onAction={() => router.push("/modules/reporting")} />
                <View style={{ gap: 12, marginBottom: 24 }}>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <StatCard label="Students" value={data.students.toLocaleString()} icon="users" accent="oasis" />
                    <StatCard label="Staff" value={data.staff.toLocaleString()} icon="briefcase" accent="sky" />
                  </View>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <StatCard label="Classes" value={data.classes.toLocaleString()} icon="book-open" accent="emerald" />
                    <StatCard label="Overdue invoices" value={data.fees.overdueCount.toLocaleString()} icon="alert-circle" accent="amber" />
                  </View>
                </View>

                {/* Fees */}
                <SectionHeader title="Fees" action="Invoices" onAction={() => router.push("/modules/fees")} />
                <Card style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                    <View>
                      <Text style={{ fontSize: 12, color: colors.slate500, fontWeight: "600" }}>Collected</Text>
                      <Text style={{ fontSize: 22, fontWeight: "800", color: "#059669", letterSpacing: -0.4 }}>UGX {money(data.fees.collected)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 12, color: colors.slate500, fontWeight: "600" }}>Outstanding</Text>
                      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.amber700, letterSpacing: -0.4 }}>UGX {money(data.fees.outstanding)}</Text>
                    </View>
                  </View>
                  <View style={{ height: 10, borderRadius: 5, backgroundColor: "rgba(245,158,11,0.18)", overflow: "hidden" }}>
                    <View style={{ width: `${feeTotal ? Math.round((data.fees.collected / feeTotal) * 100) : 0}%`, height: 10, borderRadius: 5, backgroundColor: "#10b981" }} />
                  </View>
                  <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 8 }}>
                    {feeTotal ? `${Math.round((data.fees.collected / feeTotal) * 100)}% of billed fees collected` : "No invoices yet"}
                  </Text>
                </Card>

                {/* Coming up */}
                <SectionHeader title="Coming up" action="Calendar" onAction={() => router.push("/modules/calendar")} />
                <Card padded={false} style={{ marginBottom: 24 }}>
                  {data.events.length === 0 ? (
                    <EmptyState icon="calendar" title="Nothing scheduled" />
                  ) : (
                    data.events.map((e, i) => {
                      const d = new Date(`${e.event_date}T00:00:00`);
                      return (
                        <View key={e.id} style={[rowStyle, i > 0 && dividerStyle]}>
                          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(148,152,239,0.16)", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 15, fontWeight: "800", color: colors.oasis700, lineHeight: 17 }}>{d.getDate()}</Text>
                            <Text style={{ fontSize: 9.5, fontWeight: "700", color: colors.oasis600, textTransform: "uppercase" }}>{d.toLocaleDateString("en-GB", { month: "short" })}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.slate800 }} numberOfLines={1}>
                              {e.title}
                            </Text>
                            <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 2 }}>{d.toLocaleDateString("en-GB", { weekday: "long" })}</Text>
                          </View>
                          {e.event_type ? <Badge tone="info">{e.event_type}</Badge> : null}
                        </View>
                      );
                    })
                  )}
                </Card>

                {/* Behaviour */}
                <SectionHeader title="Recent behaviour" action="All" onAction={() => router.push("/modules/behaviour")} />
                <Card padded={false} style={{ marginBottom: 8 }}>
                  {data.behaviour.length === 0 ? (
                    <EmptyState icon="award" title="No incidents logged" />
                  ) : (
                    data.behaviour.map((b, i) => (
                      <View key={b.id} style={[rowStyle, i > 0 && dividerStyle]}>
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: b.type === "positive" ? "rgba(16,185,129,0.14)" : "rgba(244,63,94,0.12)",
                          }}
                        >
                          <Feather name={b.type === "positive" ? "thumbs-up" : "alert-triangle"} size={17} color={b.type === "positive" ? "#059669" : "#e11d48"} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14.5, fontWeight: "600", color: colors.slate800 }}>{b.student}</Text>
                          <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 2 }} numberOfLines={2}>
                            {b.description}
                          </Text>
                        </View>
                        {b.points != null ? (
                          <Text style={{ fontSize: 14, fontWeight: "800", color: b.points >= 0 ? "#059669" : "#e11d48" }}>{b.points > 0 ? `+${b.points}` : b.points}</Text>
                        ) : null}
                      </View>
                    ))
                  )}
                </Card>
              </>
            )}

            {!staffView && (
              <>
                <SectionHeader title="Your portal" />
                <Card padded={false}>
                  <PortalLink icon={role === "parent" ? "heart" : "user"} label={role === "parent" ? "Parents Portal" : "Student Portal"} href={role === "parent" ? "/modules/parents-portal" : "/modules/student-portal"} />
                  <PortalLink icon="calendar" label="School calendar" href="/modules/calendar" divider />
                  <PortalLink icon="message-circle" label="Messages" href="/messages" divider />
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RoundButton({ icon, label, onPress }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      <Glass radius={22} interactive style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={19} color={colors.slate700} />
      </Glass>
    </Pressable>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingHorizontal: 2 }}>
      <Text style={{ fontSize: 19, fontWeight: "800", letterSpacing: -0.4, color: colors.slate900 }}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.oasis600 }}>{action}</Text>
          <Feather name="chevron-right" size={16} color={colors.oasis600} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ flex: 1, fontSize: 14, color: colors.slate600 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900 }}>{value}</Text>
    </View>
  );
}

function PortalLink({ icon, label, href, divider }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; href: string; divider?: boolean }) {
  return (
    <Pressable onPress={() => router.push(href as never)} style={({ pressed }) => [rowStyle, divider && dividerStyle, pressed && { backgroundColor: "rgba(148,152,239,0.12)" }]}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(148,152,239,0.16)", alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={18} color={colors.oasis600} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.slate800 }}>{label}</Text>
      <Feather name="chevron-right" size={18} color={colors.slate300} />
    </Pressable>
  );
}

const rowStyle = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingHorizontal: 16, paddingVertical: 13 };
const dividerStyle = { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" };
