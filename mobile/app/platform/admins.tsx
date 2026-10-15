import { useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/Text";
import { ListRow, PlatformScreen } from "@/components/PlatformScreen";
import { Button, Card, ErrorBanner, Field, Input, SearchInput, Select, Spinner } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useRealtimeRows } from "@/lib/useRealtimeRows";
import { EMAIL_RE, platformAction } from "@/lib/platform";
import type { Tables } from "@/types/database.types";
import { colors } from "@/theme";

/** Every school administrator across OASIS: remove/restore access, and add
 * new ones to any school. */
export default function Admins() {
  const schools = useRealtimeRows<Tables<"schools">>("schools", "name");
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [invites, setInvites] = useState<Tables<"staff">[]>([]);
  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [p, s] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "school_admin").order("full_name"),
      supabase.from("staff").select("*").eq("access_role", "school_admin").is("profile_id", null),
    ]);
    const list = p.data ?? [];
    setProfiles(list);
    setInvites(s.data ?? []);
    setLoading(false);
    if (list.length) {
      const { data } = await platformAction({ action: "list_access", user_ids: list.map((x) => x.id) });
      setBanned(new Set((data?.banned as string[]) ?? []));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const schoolName = useMemo(() => new Map(schools.rows.map((s) => [s.id, s.name])), [schools.rows]);
  const q = query.trim().toLowerCase();
  const visible = profiles.filter((p) => !q || [p.full_name, p.email, schoolName.get(p.school_id ?? "")].some((v) => v?.toLowerCase().includes(q)));
  const signedUp = new Set(profiles.map((p) => p.email?.toLowerCase()));
  const pendingInvites = invites.filter((i) => !signedUp.has(i.email?.toLowerCase()));

  function toggle(p: Tables<"profiles">) {
    const revoke = !banned.has(p.id);
    const run = async () => {
      setBusy(p.id);
      const { error } = await platformAction({ action: "set_user_access", user_id: p.id, revoked: revoke });
      setBusy(null);
      if (error) return Alert.alert("Couldn't change access", error);
      setBanned((b) => {
        const n = new Set(b);
        if (revoke) n.add(p.id);
        else n.delete(p.id);
        return n;
      });
    };
    if (!revoke) return run();
    Alert.alert("Remove access?", `${p.full_name ?? p.email} won't be able to sign in until you restore it.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove access", style: "destructive", onPress: run },
    ]);
  }

  async function add() {
    setError(null);
    if (!schoolId) return setError("Choose the school.");
    if (!name.trim() || !EMAIL_RE.test(email.trim())) return setError("Enter a name and a valid email.");
    setAdding(true);
    const { error } = await supabase
      .from("staff")
      .insert({ school_id: schoolId, full_name: name.trim(), email: email.trim().toLowerCase(), access_role: "school_admin", job_title: "Administrator", status: "active" });
    setAdding(false);
    if (error) return setError(error.message);
    Alert.alert("Administrator added", `${email.trim()} can now sign up as staff of ${schoolName.get(schoolId)}.`);
    setName("");
    setEmail("");
    load();
  }

  return (
    <PlatformScreen title="School administrators" description="Admins run their school's dashboard: classes, staff, students and parents.">
      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginBottom: 12 }}>Add an administrator</Text>
        {error && <ErrorBanner message={error} />}
        <Field label="School">
          <Select value={schoolId} onChange={setSchoolId} options={schools.rows.map((s) => ({ value: s.id, label: s.name }))} placeholder="Choose school…" />
        </Field>
        <Field label="Full name">
          <Input value={name} onChangeText={setName} autoCapitalize="words" />
        </Field>
        <Field label="Email" hint="They sign up with this email as staff of the school.">
          <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        </Field>
        <Button icon="user-plus" loading={adding} onPress={add}>
          Add administrator
        </Button>
      </Card>

      <View style={{ marginTop: 20, marginBottom: 10 }}>
        <SearchInput value={query} onChangeText={setQuery} placeholder="Search by name, email or school…" />
      </View>
      {loading ? (
        <Spinner />
      ) : (
        <Card padded={false}>
          {visible.length === 0 ? (
            <Text style={{ padding: 16, color: colors.slate400 }}>No administrators found.</Text>
          ) : (
            visible.map((p, i) => {
              const off = banned.has(p.id);
              return (
                <ListRow key={p.id} first={i === 0} onPress={p.school_id ? () => router.push(`/platform/school/${p.school_id}`) : undefined}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: off ? colors.slate400 : colors.slate800 }}>{p.full_name ?? p.email}</Text>
                    <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 1 }} numberOfLines={1}>
                      {schoolName.get(p.school_id ?? "") ?? "No school"} · {p.email}
                      {off ? " · access removed" : ""}
                    </Text>
                  </View>
                  <Button size="sm" variant={off ? "secondary" : "danger"} loading={busy === p.id} onPress={() => toggle(p)}>
                    {off ? "Restore" : "Remove"}
                  </Button>
                </ListRow>
              );
            })
          )}
        </Card>
      )}

      {pendingInvites.length > 0 && (
        <>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginTop: 20, marginBottom: 8 }}>Invited - not signed up yet</Text>
          <Card padded={false}>
            {pendingInvites.map((a, i) => (
              <ListRow key={a.id} first={i === 0}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.slate800 }}>{a.full_name}</Text>
                  <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 1 }}>
                    {schoolName.get(a.school_id) ?? ""} · {a.email}
                  </Text>
                </View>
              </ListRow>
            ))}
          </Card>
        </>
      )}
    </PlatformScreen>
  );
}
