import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Switch, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Text } from "@/components/Text";
import { ToolScreen } from "@/components/ToolScreen";
import { Button, Card, ErrorBanner, Field, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { friendlyDbError } from "@/lib/db-errors";
import { uploadSchoolAsset } from "@/lib/uploads";
import { AiFileReader } from "@/components/AiFileReader";
import { IMPORT_TEMPLATE, guardianKey, normPhone, parseStudentImport, type ImportGuardian } from "@/lib/import-students";
import { colors } from "@/theme";

type Summary = { students: number; guardians: number; links: number; classes: number; streams: number; skipped: number };

/** Students with their parents in one go - same rules as the website import:
 * one row per student, a parent with several children appears on each
 * child's row and is created once, then linked to every child. */
export default function ImportStudents() {
  const { profile, role } = useAuth();
  const params = useLocalSearchParams<{ example?: string }>();
  const [text, setText] = useState(params.example === "1" ? IMPORT_TEMPLATE : "");
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [createClasses, setCreateClasses] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiFiles, setAiFiles] = useState<{ id: string; name: string }[]>([]);
  const [aiUploading, setAiUploading] = useState(false);

  async function aiPick() {
    if (!profile?.school_id) return;
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
    if (res.canceled) return;
    setAiUploading(true);
    const added: { id: string; name: string }[] = [];
    for (const asset of res.assets) {
      const { error: upErr, id } = await uploadSchoolAsset(profile.school_id, asset, "data", "Uploaded for AI import");
      if (upErr) Alert.alert(`Couldn't upload ${asset.name}`, upErr);
      else if (id) added.push({ id, name: asset.name });
    }
    setAiUploading(false);
    setAiFiles((f) => [...added, ...f]);
  }

  useEffect(() => {
    supabase
      .from("students")
      .select("admission_number")
      .then(({ data }) =>
        setExisting(new Set(((data as { admission_number: string | null }[]) ?? []).map((r) => r.admission_number?.toLowerCase()).filter(Boolean) as string[]))
      );
  }, [summary]);

  const parsed = useMemo(() => parseStudentImport(text, existing), [text, existing]);
  const valid = parsed.rows.filter((r) => !r.error);
  const classNames = useMemo(() => [...new Set(valid.map((r) => r.className).filter(Boolean) as string[])], [valid]);
  const parentCount = useMemo(() => new Set(valid.flatMap((r) => r.guardians.map(guardianKey))).size, [valid]);

  async function chooseFile() {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ["text/csv", "text/comma-separated-values", "text/plain", "text/tab-separated-values", "*/*"] });
    if (res.canceled) return;
    const asset = res.assets[0];
    if (/\.xlsx?$/i.test(asset.name)) return Alert.alert("Save as CSV first", "In Excel or Google Sheets choose File → Save as / Download → CSV, then pick that file. Or copy the rows and paste them here.");
    try {
      setText(asset.file ? await asset.file.text() : await (await fetch(asset.uri)).text());
    } catch (e) {
      Alert.alert("Couldn't read the file", (e as Error).message);
    }
  }

  async function run() {
    const schoolId = profile?.school_id;
    if (!schoolId || !valid.length) return;
    setError(null);
    setSummary(null);
    const s: Summary = { students: 0, guardians: 0, links: 0, classes: 0, streams: 0, skipped: parsed.rows.length - valid.length };
    try {
      setRunning("Matching classes…");
      const { data: classRows } = await supabase.from("classes").select("id, name");
      const classByName = new Map(((classRows as { id: string; name: string }[]) ?? []).map((c) => [c.name.trim().toLowerCase(), c]));
      const missing = classNames.filter((n) => !classByName.has(n.toLowerCase()));
      if (missing.length && createClasses) {
        const { data, error } = await supabase.from("classes").insert(missing.map((name) => ({ school_id: schoolId, name }))).select("id, name");
        if (error) throw error;
        for (const c of data ?? []) classByName.set(c.name.trim().toLowerCase(), c);
        s.classes = data?.length ?? 0;
      }
      const { data: streamRows } = await supabase.from("streams").select("id, name, class_id");
      const streamKey = (classId: string, name: string) => `${classId}|${name.trim().toLowerCase()}`;
      const streamBy = new Map(((streamRows as { id: string; name: string; class_id: string }[]) ?? []).map((st) => [streamKey(st.class_id, st.name), st.id]));
      const neededStreams = new Map<string, { class_id: string; name: string }>();
      for (const r of valid) {
        const c = r.className ? classByName.get(r.className.toLowerCase()) : null;
        if (c && r.streamName && !streamBy.has(streamKey(c.id, r.streamName))) neededStreams.set(streamKey(c.id, r.streamName), { class_id: c.id, name: r.streamName });
      }
      if (neededStreams.size) {
        const { data, error } = await supabase.from("streams").insert([...neededStreams.values()].map((v) => ({ ...v, school_id: schoolId }))).select("id, name, class_id");
        if (error) throw error;
        for (const st of data ?? []) streamBy.set(streamKey(st.class_id, st.name), st.id);
        s.streams = data?.length ?? 0;
      }

      // Parents: reuse existing ones (same phone or email), create the rest once.
      setRunning("Adding parents…");
      const { data: existingGuardians } = await supabase.from("guardians").select("id, phone, email");
      const guardianBy = new Map<string, string>();
      for (const g of (existingGuardians as { id: string; phone: string | null; email: string | null }[]) ?? []) {
        if (g.phone) guardianBy.set(`p:${normPhone(g.phone)}`, g.id);
        if (g.email) guardianBy.set(`e:${g.email.toLowerCase()}`, g.id);
      }
      const toCreate = new Map<string, ImportGuardian>();
      for (const r of valid) for (const g of r.guardians) if (!guardianBy.has(guardianKey(g))) toCreate.set(guardianKey(g), g);
      const newGuardians = [...toCreate.entries()];
      for (let i = 0; i < newGuardians.length; i += 200) {
        const chunk = newGuardians.slice(i, i + 200);
        const { data, error } = await supabase
          .from("guardians")
          .insert(chunk.map(([, g]) => ({ school_id: schoolId, full_name: g.name, phone: g.phone, email: g.email, relationship: g.relationship, is_emergency_contact: true })))
          .select("id");
        if (error) throw error;
        (data ?? []).forEach((row, j) => guardianBy.set(chunk[j][0], row.id));
        s.guardians += data?.length ?? 0;
      }

      setRunning("Adding students…");
      const links: { school_id: string; student_id: string; guardian_id: string }[] = [];
      for (let i = 0; i < valid.length; i += 200) {
        const chunk = valid.slice(i, i + 200);
        const { data, error } = await supabase
          .from("students")
          .insert(
            chunk.map((r) => {
              const c = r.className ? classByName.get(r.className.toLowerCase()) : null;
              const g = r.guardians[0];
              return {
                school_id: schoolId,
                full_name: r.full_name,
                admission_number: r.admission_number,
                gender: r.gender,
                date_of_birth: r.date_of_birth,
                class_id: c?.id ?? null,
                form_class: c?.name ?? r.className,
                stream_id: c && r.streamName ? (streamBy.get(streamKey(c.id, r.streamName)) ?? null) : null,
                guardian_name: g?.name ?? null,
                guardian_phone: g?.phone ?? null,
                guardian_email: g?.email ?? null,
                status: "active",
              };
            })
          )
          .select("id");
        if (error) throw error;
        (data ?? []).forEach((row, j) => {
          for (const g of chunk[j].guardians) {
            const gid = guardianBy.get(guardianKey(g));
            if (gid) links.push({ school_id: schoolId, student_id: row.id, guardian_id: gid });
          }
        });
        s.students += data?.length ?? 0;
        setRunning(`Adding students… ${s.students}/${valid.length}`);
      }

      setRunning("Linking parents to children…");
      const uniqueLinks = [...new Map(links.map((l) => [`${l.student_id}|${l.guardian_id}`, l])).values()];
      for (let i = 0; i < uniqueLinks.length; i += 500) {
        const { error } = await supabase.from("student_guardians").insert(uniqueLinks.slice(i, i + 500));
        if (error) throw error;
      }
      s.links = uniqueLinks.length;
      setSummary(s);
      setText("");
    } catch (e) {
      setError(`${friendlyDbError((e as Error).message)} - anything shown as added was saved.`);
      setSummary(s);
    } finally {
      setRunning(null);
    }
  }

  if (role && role !== "school_admin")
    return (
      <ToolScreen title="Import students & parents">
        <ErrorBanner message="Only school administrators can import data." />
      </ToolScreen>
    );

  return (
    <ToolScreen
      title="Import students & parents"
      description="Paste your list from Excel or Google Sheets, or pick a CSV. One row per student - a parent with several children just appears on each child's row."
      footer={
        valid.length ? (
          <Button size="lg" icon="upload-cloud" onPress={run} loading={!!running}>
            {running ?? `Import ${valid.length} student${valid.length === 1 ? "" : "s"}`}
          </Button>
        ) : null
      }
    >
      {error && <ErrorBanner message={error} />}
      {summary && (
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Feather name="check-circle" size={20} color={colors.emerald600} />
            <Text style={{ flex: 1, fontSize: 14, color: colors.slate800, lineHeight: 20 }}>
              Added {summary.students} students, {summary.guardians} new parents and {summary.links} parent–child links
              {summary.classes ? `, ${summary.classes} classes` : ""}
              {summary.streams ? `, ${summary.streams} streams` : ""}.{summary.skipped ? ` ${summary.skipped} rows with problems were skipped.` : ""}
            </Text>
          </View>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Feather name="zap" size={17} color={colors.oasis600} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900 }}>Let AI read your files</Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.slate600, lineHeight: 18, marginBottom: 12 }}>
          Excel (any layout), CSV, a PDF class list or a photo of a register - Claude finds the students, parents, staff and classes. Check the preview, then import.
        </Text>
        <Button variant="secondary" icon="upload" loading={aiUploading} onPress={aiPick}>
          Choose files
        </Button>
        {aiFiles.map((f) => (
          <View key={f.id} style={{ marginTop: 12, gap: 6 }}>
            <Text style={{ fontSize: 13.5, fontWeight: "600", color: colors.slate800 }} numberOfLines={1}>
              {f.name}
            </Text>
            <AiFileReader fileId={f.id} />
          </View>
        ))}
      </Card>

      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginBottom: 10 }}>Or paste a list</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <Button variant="secondary" icon="file" onPress={chooseFile} style={{ flex: 1 }}>
          Choose CSV
        </Button>
        <Button variant="secondary" icon="clipboard" onPress={() => setText(IMPORT_TEMPLATE)} style={{ flex: 1 }}>
          Use example
        </Button>
      </View>

      <Field label="Student list" hint="Columns are matched by their headings: Student name, Admission no, Class, Stream, Gender, Date of birth, Parent name/phone/email, Mother name/phone…">
        <Input value={text} onChangeText={setText} multiline autoCorrect={false} autoCapitalize="none" placeholder="Paste rows here, headings first" style={{ height: 170, fontSize: 13 }} />
      </Field>

      {parsed.rows.length > 0 && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: colors.slate800, fontWeight: "600" }}>
              {valid.length} students · {parentCount} parents · {classNames.length} classes
            </Text>
            <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 4 }}>Recognised: {parsed.columns.join(", ")}</Text>
            {parsed.unknown.length > 0 && <Text style={{ fontSize: 12, color: colors.amber700, marginTop: 4 }}>Ignored columns: {parsed.unknown.join(", ")}</Text>}
            {classNames.length > 0 && (
              <Pressable onPress={() => setCreateClasses((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
                <Switch value={createClasses} onValueChange={setCreateClasses} />
                <Text style={{ flex: 1, fontSize: 13, color: colors.slate700 }}>Create classes and streams that don&apos;t exist yet</Text>
              </Pressable>
            )}
          </Card>
          <Card padded={false}>
            {parsed.rows.slice(0, 200).map((r, i) => (
              <View
                key={`${r.line}-${i}`}
                style={[{ flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 10 }, i > 0 && { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" }]}
              >
                <Feather name={r.error ? "alert-circle" : "check-circle"} size={17} color={r.error ? colors.rose600 : "#10b981"} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: colors.slate800, fontWeight: "600" }}>{r.full_name || `Line ${r.line}`}</Text>
                  <Text style={{ fontSize: 12, color: r.error ? colors.rose600 : colors.slate500, marginTop: 1 }}>
                    {r.error ?? ([r.admission_number, [r.className, r.streamName].filter(Boolean).join(" "), r.gender === "male" ? "M" : r.gender === "female" ? "F" : null].filter(Boolean).join(" · ") || "Name only")}
                  </Text>
                  {!r.error && r.guardians.length > 0 && (
                    <Text style={{ fontSize: 12, color: colors.oasis600, marginTop: 1 }} numberOfLines={1}>
                      {r.guardians.map((g) => [g.name, g.phone].filter(Boolean).join(" ")).join(" · ")}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </Card>
          {parsed.rows.length > 200 && <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 8 }}>Showing the first 200 rows - all {valid.length} valid rows will be imported.</Text>}
        </>
      )}
    </ToolScreen>
  );
}
