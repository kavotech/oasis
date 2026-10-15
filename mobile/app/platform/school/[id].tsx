import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { ListRow, PlatformScreen, Segments } from "@/components/PlatformScreen";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, Select, Spinner } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { EMAIL_RE, platformAction } from "@/lib/platform";
import { DOCUMENTS, SECTIONS, STATUS_LABEL, STATUS_TONE } from "@/lib/onboarding";
import { formatBytes, signedUrl } from "@/lib/uploads";
import { ROLE_LABELS, type UserRole } from "@/lib/auth";
import type { Tables } from "@/types/database.types";
import { colors } from "@/theme";

type Tab = "application" | "files" | "people" | "decision";

/** One school, everything a developer needs to decide on it. */
export default function SchoolDetail() {
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const [school, setSchool] = useState<Tables<"schools"> | null>(null);
  const [app, setApp] = useState<Tables<"school_applications"> | null>(null);
  const [files, setFiles] = useState<Tables<"school_files">[]>([]);
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [admins, setAdmins] = useState<Tables<"staff">[]>([]);
  const [counts, setCounts] = useState({ students: 0, staff: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab && ["application", "files", "people", "decision"].includes(initialTab) ? initialTab : "application");

  const load = useCallback(async () => {
    const [s, a, f, p, st, sc, stc] = await Promise.all([
      supabase.from("schools").select("*").eq("id", id).maybeSingle(),
      supabase.from("school_applications").select("*").eq("school_id", id).maybeSingle(),
      supabase.from("school_files").select("*").eq("school_id", id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("school_id", id).order("full_name"),
      supabase.from("staff").select("*").eq("school_id", id).eq("access_role", "school_admin"),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", id),
      supabase.from("staff").select("id", { count: "exact", head: true }).eq("school_id", id),
    ]);
    setSchool(s.data ?? null);
    setApp(a.data ?? null);
    setFiles(f.data ?? []);
    setProfiles(p.data ?? []);
    setAdmins(st.data ?? []);
    setCounts({ students: sc.count ?? 0, staff: stc.count ?? 0 });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner />;
  if (!school)
    return (
      <PlatformScreen title="School not found">
        <EmptyState icon="alert-circle" title="This school no longer exists" />
      </PlatformScreen>
    );

  return (
    <PlatformScreen
      title={school.name}
      description={[school.code, school.district, school.contact_email].filter(Boolean).join(" · ")}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    >
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: -8, marginBottom: 16 }}>
        <Badge tone={STATUS_TONE[school.status] ?? "neutral"}>{STATUS_LABEL[school.status] ?? school.status}</Badge>
        <Badge>{`${counts.students} students`}</Badge>
        <Badge>{`${profiles.length} logins`}</Badge>
      </View>
      <Segments
        value={tab}
        onChange={setTab}
        options={[
          { value: "application", label: "Application" },
          { value: "files", label: "Files", count: files.length },
          { value: "people", label: "People & access", count: profiles.length },
          { value: "decision", label: "Decision" },
        ]}
      />
      {tab === "application" && <ApplicationTab app={app} />}
      {tab === "files" && <FilesTab files={files} onChange={load} />}
      {tab === "people" && <PeopleTab school={school} profiles={profiles} admins={admins} onChange={load} />}
      {tab === "decision" && <DecisionTab school={school} counts={counts} logins={profiles.length} onChange={load} />}
    </PlatformScreen>
  );
}

function ApplicationTab({ app }: { app: Tables<"school_applications"> | null }) {
  const data = (app?.data ?? null) as Record<string, Record<string, string | string[]>> | null;
  if (!data)
    return (
      <Card>
        <EmptyState icon="file-text" title="No application yet" description="The school hasn't filled in the registration form." />
      </Card>
    );
  return (
    <View style={{ gap: 12 }}>
      {app?.submitted_at ? (
        <Text style={{ fontSize: 12.5, color: colors.slate500 }}>Submitted {new Date(app.submitted_at).toLocaleString("en-GB")}</Text>
      ) : (
        <Badge tone="warning">Draft - not submitted yet</Badge>
      )}
      {app?.review_note ? (
        <Card>
          <Text style={{ fontSize: 12, color: colors.slate500 }}>Last note to the school</Text>
          <Text style={{ fontSize: 14, color: colors.slate800, marginTop: 4 }}>{app.review_note}</Text>
        </Card>
      ) : null}
      {SECTIONS.map((sec) => (
        <Card key={sec.key}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginBottom: 8 }}>{sec.title}</Text>
          {sec.fields.map((f) => {
            const raw = data[sec.key]?.[f.key];
            const val = Array.isArray(raw)
              ? raw.map((v) => f.options?.find((o) => o.value === v)?.label ?? v).join(", ")
              : (f.options?.find((o) => o.value === raw)?.label ?? raw);
            return (
              <View key={f.key} style={{ flexDirection: "row", gap: 10, paddingVertical: 5 }}>
                <Text style={{ width: 130, fontSize: 13, color: colors.slate500 }}>{f.label}</Text>
                <Text selectable style={{ flex: 1, fontSize: 13.5, color: val ? colors.slate800 : colors.slate300 }}>
                  {val || "—"}
                </Text>
              </View>
            );
          })}
        </Card>
      ))}
    </View>
  );
}

function FilesTab({ files, onChange }: { files: Tables<"school_files">[]; onChange: () => void }) {
  const [opening, setOpening] = useState<string | null>(null);
  if (!files.length)
    return (
      <Card>
        <EmptyState icon="paperclip" title="No files yet" description="Documents and data files the school uploads appear here." />
      </Card>
    );
  async function open(path: string) {
    setOpening(path);
    const url = await signedUrl(path);
    setOpening(null);
    if (!url) return Alert.alert("Couldn't open file");
    Linking.openURL(url);
  }
  async function setStatus(fileId: string, status: string) {
    await supabase.from("school_files").update({ status }).eq("id", fileId);
    onChange();
  }
  return (
    <Card padded={false}>
      {files.map((f, i) => (
        <View key={f.id} style={[{ padding: 14 }, i > 0 && { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name={f.category === "data" ? "database" : "file-text"} size={18} color={colors.oasis600} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.slate800 }} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 1 }} numberOfLines={2}>
                {[
                  f.category === "document" ? (DOCUMENTS.find((d) => d.key === f.note)?.label ?? "Document") : "School data",
                  formatBytes(f.size_bytes),
                  new Date(f.created_at).toLocaleDateString("en-GB"),
                  f.category === "data" && f.note ? `"${f.note}"` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            <Button size="sm" variant="secondary" icon="download" loading={opening === f.path} onPress={() => open(f.path)}>
              Open
            </Button>
          </View>
          {f.category === "data" && (
            <View style={{ marginTop: 10 }}>
              <Select
                value={f.status}
                onChange={(v) => v && setStatus(f.id, v)}
                allowClear={false}
                options={[
                  { value: "received", label: "Received - not loaded yet" },
                  { value: "imported", label: "Imported onto the dashboard" },
                  { value: "rejected", label: "Can't use this file" },
                ]}
              />
            </View>
          )}
        </View>
      ))}
    </Card>
  );
}

function PeopleTab({ school, profiles, admins, onChange }: { school: Tables<"schools">; profiles: Tables<"profiles">[]; admins: Tables<"staff">[]; onChange: () => void }) {
  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = useMemo(() => profiles.map((p) => p.id).sort().join(","), [profiles]);

  useEffect(() => {
    if (!ids) return;
    platformAction({ action: "list_access", user_ids: ids.split(",") }).then(({ data }) => setBanned(new Set((data?.banned as string[]) ?? [])));
  }, [ids]);

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

  async function addAdmin() {
    setError(null);
    if (!name.trim() || !EMAIL_RE.test(email.trim())) return setError("Enter a name and a valid email.");
    setAdding(true);
    const { error } = await supabase
      .from("staff")
      .insert({ school_id: school.id, full_name: name.trim(), email: email.trim().toLowerCase(), access_role: "school_admin", job_title: "Administrator", status: "active" });
    setAdding(false);
    if (error) return setError(error.message);
    Alert.alert("Administrator added", `${email.trim()} can now sign up in the app or website as staff of ${school.name}.`);
    setName("");
    setEmail("");
    onChange();
  }

  const signedUp = new Set(profiles.map((p) => p.email?.toLowerCase()));
  const invited = admins.filter((a) => !a.profile_id && !signedUp.has(a.email?.toLowerCase()));

  return (
    <View style={{ gap: 14 }}>
      <Card padded={false}>
        <View style={{ padding: 16, paddingBottom: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900 }}>Logins at this school</Text>
          <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 2 }}>Removing access signs them out straight away.</Text>
        </View>
        {profiles.length === 0 ? (
          <Text style={{ padding: 16, color: colors.slate400, fontSize: 13.5 }}>No logins yet.</Text>
        ) : (
          profiles.map((p) => {
            const off = banned.has(p.id);
            return (
              <ListRow key={p.id}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: off ? colors.slate400 : colors.slate800 }}>{p.full_name ?? p.email}</Text>
                  <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 1 }} numberOfLines={1}>
                    {ROLE_LABELS[p.role as UserRole] ?? p.role} · {p.email}
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

      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900 }}>Add an administrator</Text>
        <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 2, marginBottom: 14, lineHeight: 18 }}>
          Head teacher, ICT or data manager. They sign up with this email (Staff → this school) and get admin access to add classes, staff and students.
        </Text>
        {error && <ErrorBanner message={error} />}
        <Field label="Full name">
          <Input value={name} onChangeText={setName} placeholder="e.g. Sarah Namutebi" autoCapitalize="words" />
        </Field>
        <Field label="Email">
          <Input value={email} onChangeText={setEmail} placeholder="name@school.ac.ug" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        </Field>
        <Button icon="user-plus" loading={adding} onPress={addAdmin}>
          Add administrator
        </Button>
        {invited.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 12, color: colors.slate500, marginBottom: 4 }}>Invited - not signed up yet</Text>
            {invited.map((a) => (
              <Text key={a.id} style={{ fontSize: 13.5, color: colors.slate700, paddingVertical: 3 }}>
                {a.full_name} · {a.email}
              </Text>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

function DecisionTab({ school, counts, logins, onChange }: { school: Tables<"schools">; counts: { students: number }; logins: number; onChange: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");

  async function setStatus(status: string) {
    if (status !== "approved" && status !== "pending_review" && !note.trim()) return Alert.alert("Add a note", "Tell the school why - it's included in the email we send them.");
    setBusy(status);
    const { error } = await platformAction({ action: "set_school_status", school_id: school.id, status, note: note.trim() });
    setBusy(null);
    if (error) return Alert.alert("Couldn't update", error);
    setNote("");
    Alert.alert("Done", `${school.name} is now ${STATUS_LABEL[status]?.toLowerCase() ?? status}. The school has been emailed.`);
    onChange();
  }

  async function remove() {
    setBusy("delete");
    const { error } = await platformAction({ action: "delete_school", school_id: school.id, confirm_name: confirmName });
    setBusy(null);
    if (error) return Alert.alert("Couldn't delete", error);
    router.replace("/platform");
  }

  const canDelete = counts.students === 0 && logins === 0;

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginBottom: 12 }}>Decide on this school</Text>
        <Field label="Note to the school" hint="Required to ask for more info, reject or suspend. Emailed to the school's contacts.">
          <Input value={note} onChangeText={setNote} multiline placeholder="e.g. Please upload your operating licence." />
        </Field>
        <View style={{ gap: 8 }}>
          {school.status !== "approved" && (
            <Button icon="check" loading={busy === "approved"} onPress={() => setStatus("approved")}>
              Approve & unlock dashboard
            </Button>
          )}
          {school.status !== "approved" && school.status !== "suspended" && (
            <Button variant="secondary" icon="message-circle" loading={busy === "more_info_requested"} onPress={() => setStatus("more_info_requested")}>
              Ask for more info
            </Button>
          )}
          {school.status !== "rejected" && school.status !== "approved" && school.status !== "suspended" && (
            <Button variant="danger" icon="x" loading={busy === "rejected"} onPress={() => setStatus("rejected")}>
              Reject
            </Button>
          )}
          {school.status === "approved" && (
            <Button variant="danger" icon="pause" loading={busy === "suspended"} onPress={() => setStatus("suspended")}>
              Suspend school
            </Button>
          )}
          {(school.status === "suspended" || school.status === "rejected") && (
            <Button variant="secondary" icon="rotate-ccw" loading={busy === "approved"} onPress={() => setStatus("approved")}>
              Restore (approve)
            </Button>
          )}
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.rose600 }}>Delete school</Text>
        <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 2, marginBottom: 12, lineHeight: 18 }}>
          {canDelete
            ? "Removes the school, its application and uploaded files. This can't be undone."
            : `Only empty schools can be deleted - this one has ${counts.students} students and ${logins} logins. Suspend it instead.`}
        </Text>
        {canDelete && (
          <>
            <Field label={`Type "${school.name}" to confirm`}>
              <Input value={confirmName} onChangeText={setConfirmName} autoCapitalize="none" autoCorrect={false} />
            </Field>
            <Button variant="danger" icon="trash-2" disabled={confirmName.trim() !== school.name} loading={busy === "delete"} onPress={remove}>
              Delete permanently
            </Button>
          </>
        )}
      </Card>
    </View>
  );
}
