import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { Glass } from "@/components/glass";
import { ListRow, PlatformScreen, Segments } from "@/components/PlatformScreen";
import { Badge, Card, EmptyState, SearchInput, Spinner, type IconName } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useRealtimeRows } from "@/lib/useRealtimeRows";
import { isRegistration } from "@/lib/platform";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/onboarding";
import type { Tables } from "@/types/database.types";
import { colors } from "@/theme";

const TABS = [
  { value: "open", label: "Needs review", statuses: ["pending_review"] },
  { value: "info", label: "Waiting on school", statuses: ["more_info_requested"] },
  { value: "closed", label: "Decided", statuses: ["approved", "rejected", "suspended"] },
  { value: "all", label: "All schools", statuses: [] as string[] },
] as const;
type TabKey = (typeof TABS)[number]["value"];

const LINKS: { href: string; icon: IconName; title: string; body: string }[] = [
  { href: "/platform/admins", icon: "shield", title: "School administrators", body: "See, add and remove admins" },
  { href: "/platform/developers", icon: "code", title: "Developers & keys", body: "Who controls OASIS, plus API keys" },
];

/** Developer console home: the onboarding inbox and every school. */
export default function PlatformHome() {
  const { profile, signOut } = useAuth();
  const schools = useRealtimeRows<Tables<"schools">>("schools");
  const apps = useRealtimeRows<Tables<"school_applications">>("school_applications");
  const files = useRealtimeRows<Tables<"school_files">>("school_files");
  const [tab, setTab] = useState<TabKey>("open");
  const [query, setQuery] = useState("");

  const appBySchool = useMemo(() => new Map(apps.rows.map((a) => [a.school_id, a])), [apps.rows]);
  const filesBySchool = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of files.rows) m.set(f.school_id, (m.get(f.school_id) ?? 0) + 1);
    return m;
  }, [files.rows]);

  const registrations = schools.rows.filter(isRegistration);
  const inTab = (t: (typeof TABS)[number]) => (t.value === "all" ? schools.rows : registrations.filter((s) => (t.statuses as readonly string[]).includes(s.status)));
  const current = TABS.find((t) => t.value === tab)!;
  const q = query.trim().toLowerCase();
  const list = inTab(current)
    .filter((s) => !q || [s.name, s.district, s.contact_email, s.code].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) =>
      tab === "all" ? a.name.localeCompare(b.name) : (appBySchool.get(b.id)?.submitted_at ?? b.created_at).localeCompare(appBySchool.get(a.id)?.submitted_at ?? a.created_at)
    );
  const pending = registrations.filter((s) => s.status === "pending_review").length;

  return (
    <PlatformScreen
      back={false}
      title="OASIS console"
      description={`Signed in as ${profile?.full_name ?? "developer"}. You're in control of school onboarding and access.`}
      refreshing={schools.refreshing}
      onRefresh={() => {
        schools.pullToRefresh();
        apps.refetch();
        files.refetch();
      }}
      action={
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/login");
          }}
          accessibilityLabel="Sign out"
        >
          <Glass radius={22} interactive style={{ height: 44, paddingHorizontal: 14, flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Feather name="log-out" size={16} color={colors.slate700} />
            <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors.slate700 }}>Sign out</Text>
          </Glass>
        </Pressable>
      }
    >
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <Stat label="Need review" value={pending} tone={pending ? colors.amber600 : colors.slate400} />
        <Stat label="Approved" value={registrations.filter((s) => s.status === "approved").length} tone={colors.emerald600} />
        <Stat label="Files in" value={files.rows.length} tone={colors.oasis600} />
      </View>

      <View style={{ gap: 10, marginBottom: 22 }}>
        {LINKS.map((l) => (
          <Pressable key={l.href} onPress={() => router.push(l.href as never)}>
            <Card padded={false}>
              <ListRow first>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.oasis50, alignItems: "center", justifyContent: "center" }}>
                  <Feather name={l.icon} size={18} color={colors.oasis600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.slate900 }}>{l.title}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 1 }}>{l.body}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.slate300} />
              </ListRow>
            </Card>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.slate900, marginBottom: 10 }}>Onboarding requests</Text>
      <Segments value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.value, label: t.label, count: inTab(t).length }))} />
      {tab === "all" && (
        <View style={{ marginBottom: 12 }}>
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search schools…" />
        </View>
      )}

      {schools.loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon="inbox" title="Nothing here" description={tab === "open" ? "No registrations are waiting for review." : "No schools in this state."} />
        </Card>
      ) : (
        <Card padded={false}>
          {list.map((s, i) => {
            const app = appBySchool.get(s.id);
            const n = filesBySchool.get(s.id) ?? 0;
            return (
              <ListRow key={s.id} first={i === 0} onPress={() => router.push(`/platform/school/${s.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.slate900 }} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                    <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{STATUS_LABEL[s.status] ?? s.status}</Badge>
                    {isRegistration(s) && !app?.submitted_at && <Badge>Form not finished</Badge>}
                    {n > 0 && <Badge tone="info">{`${n} file${n === 1 ? "" : "s"}`}</Badge>}
                  </View>
                  <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 5 }} numberOfLines={1}>
                    {[s.district, s.contact_name, s.contact_email].filter(Boolean).join(" · ") || "No details yet"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.slate300} />
              </ListRow>
            );
          })}
        </Card>
      )}
    </PlatformScreen>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card style={{ flex: 1 }} padded={false}>
      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: tone }}>{value}</Text>
        <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 2 }}>{label}</Text>
      </View>
    </Card>
  );
}
