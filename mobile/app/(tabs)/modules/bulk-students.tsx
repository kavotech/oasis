import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { ToolScreen, useClasses } from "@/components/ToolScreen";
import { Button, Card, ErrorBanner, Field, Input, Select } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { BULK_STUDENTS_EXAMPLE, parseStudentLines } from "@/lib/bulk";
import { colors } from "@/theme";

/** Paste a class list (from Excel, Google Sheets or typed), pick the class
 * once, preview, and create every student in one insert. */
export default function BulkStudents() {
  const { profile, role } = useAuth();
  const { classes, streams } = useClasses();
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [text, setText] = useState("");
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canWrite = role === "school_admin" || role === "teacher";

  useEffect(() => {
    supabase
      .from("students")
      .select("admission_number")
      .then(({ data }) =>
        setExisting(new Set(((data as { admission_number: string | null }[]) ?? []).map((r) => r.admission_number?.toLowerCase()).filter(Boolean) as string[]))
      );
  }, []);

  const rows = useMemo(() => parseStudentLines(text, existing), [text, existing]);
  const valid = rows.filter((r) => !r.error);
  const invalid = rows.length - valid.length;
  const classStreams = streams.filter((s) => s.class_id === classId);
  const className = classes.find((c) => c.id === classId)?.name ?? null;

  async function save() {
    if (!profile?.school_id || !valid.length) return;
    if (!classId) return setError("Choose the class these students are joining.");
    setError(null);
    setSaving(true);
    const payload = valid.map((r) => ({
      school_id: profile.school_id!,
      full_name: r.full_name,
      admission_number: r.admission_number,
      gender: r.gender,
      date_of_birth: r.date_of_birth,
      class_id: classId,
      form_class: className,
      stream_id: streamId || null,
      status: "active",
    }));
    const { error } = await supabase.from("students").insert(payload);
    setSaving(false);
    if (error) return setError(error.message);
    Alert.alert("Students added", `${payload.length} student${payload.length === 1 ? "" : "s"} added to ${className}.`, [
      { text: "Done", onPress: () => (router.canGoBack() ? router.back() : router.navigate("/students")) },
    ]);
    setText("");
  }

  return (
    <ToolScreen
      title="Bulk add students"
      description="Paste a class list - one student per line. Copy straight from Excel or Google Sheets, or type it."
      footer={
        canWrite && valid.length ? (
          <Button size="lg" icon="user-plus" onPress={save} loading={saving}>
            Add {valid.length} student{valid.length === 1 ? "" : "s"}
          </Button>
        ) : null
      }
    >
      {error && <ErrorBanner message={error} />}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Class *">
            <Select
              value={classId}
              onChange={(v) => {
                setClassId(v);
                setStreamId("");
              }}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select class…"
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Stream">
            <Select value={streamId} onChange={setStreamId} options={classStreams.map((s) => ({ value: s.id, label: s.name }))} placeholder={classId ? "Optional…" : "Pick class first"} />
          </Field>
        </View>
      </View>

      <Field label="Students" hint="Columns: Full name, Admission no, Gender (M/F), Date of birth - only the name is required.">
        <Input
          value={text}
          onChangeText={setText}
          multiline
          autoCapitalize="words"
          autoCorrect={false}
          placeholder={"Amina Nakato, ODS/2026/101, F, 14/03/2012\nBrian Okello, ODS/2026/102, M, 02/11/2011"}
          style={{ height: 170, fontSize: 14 }}
        />
      </Field>
      {!text && (
        <Pressable onPress={() => setText(BULK_STUDENTS_EXAMPLE)} style={{ alignSelf: "flex-start", marginTop: -6, marginBottom: 16 }}>
          <Text style={{ color: colors.oasis600, fontWeight: "600", fontSize: 13.5 }}>Fill in an example</Text>
        </Pressable>
      )}

      {rows.length > 0 && (
        <>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginBottom: 8 }}>
            Preview · {valid.length} ready{invalid ? ` · ${invalid} to fix` : ""}
          </Text>
          <Card padded={false}>
            {rows.map((r, i) => (
              <View
                key={`${r.line}-${i}`}
                style={[
                  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
                  i > 0 && { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" },
                ]}
              >
                <Feather name={r.error ? "alert-circle" : "check-circle"} size={17} color={r.error ? "#e11d48" : "#10b981"} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: colors.slate800, fontWeight: "600" }}>{r.full_name || `Line ${r.line}`}</Text>
                  <Text style={{ fontSize: 12, color: r.error ? "#e11d48" : colors.slate500, marginTop: 1 }}>
                    {r.error ??
                      ([r.admission_number, r.gender === "male" ? "Male" : r.gender === "female" ? "Female" : null, r.date_of_birth].filter(Boolean).join(" · ") || "Name only")}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
          {invalid > 0 && (
            <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 8 }}>Lines with problems are skipped - fix them above to include them.</Text>
          )}
        </>
      )}
    </ToolScreen>
  );
}
