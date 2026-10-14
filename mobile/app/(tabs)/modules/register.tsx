import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/Text";
import { ToolScreen, useClasses } from "@/components/ToolScreen";
import { Avatar, Button, Card, DateTimeField, EmptyState, ErrorBanner, Field, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { localToday } from "@/lib/bulk";
import { colors } from "@/theme";

type Status = "present" | "late" | "absent" | "excused";
type Student = { id: string; full_name: string; admission_number: string | null };

const STATUSES: { value: Status; short: string; color: string }[] = [
  { value: "present", short: "P", color: "#10b981" },
  { value: "late", short: "L", color: "#f59e0b" },
  { value: "absent", short: "A", color: "#f43f5e" },
  { value: "excused", short: "E", color: "#9498ef" },
];

/** Whole-class register: everyone starts Present, tap the exceptions, save once.
 * Saves are upserts on (student_id, date), so re-saving a day edits it. */
export default function Register() {
  const { profile, user, role } = useAuth();
  const params = useLocalSearchParams<{ class?: string }>();
  const { classes } = useClasses();
  const [classId, setClassId] = useState(params.class ?? "");
  const [date, setDate] = useState(localToday());
  const [students, setStudents] = useState<Student[] | null>(null);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [alreadyMarked, setAlreadyMarked] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canWrite = role === "school_admin" || role === "teacher";

  // Default to the first class once classes load.
  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classes, classId]);

  useEffect(() => {
    if (!classId || !date) return;
    let active = true;
    setStudents(null);
    (async () => {
      const { data: rows, error: e1 } = await supabase
        .from("students")
        .select("id, full_name, admission_number")
        .eq("class_id", classId)
        .eq("status", "active")
        .order("full_name");
      if (!active) return;
      if (e1) return setError(e1.message);
      const list = (rows as Student[]) ?? [];
      const ids = list.map((s) => s.id);
      const existing = ids.length
        ? (await supabase.from("attendance_records").select("student_id, status").eq("date", date).in("student_id", ids)).data ?? []
        : [];
      if (!active) return;
      const next: Record<string, Status> = {};
      for (const s of list) next[s.id] = "present";
      for (const r of existing as { student_id: string; status: Status }[]) next[r.student_id] = r.status;
      setAlreadyMarked(existing.length);
      setMarks(next);
      setStudents(list);
      setError(null);
    })();
    return () => {
      active = false;
    };
  }, [classId, date]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { present: 0, late: 0, absent: 0, excused: 0 };
    for (const s of students ?? []) c[marks[s.id] ?? "present"]++;
    return c;
  }, [students, marks]);

  async function save() {
    if (!profile?.school_id || !students?.length) return;
    setSaving(true);
    const rows = students.map((s) => ({ school_id: profile.school_id!, student_id: s.id, date, status: marks[s.id] ?? "present", marked_by: user?.id ?? null }));
    const { error } = await supabase.from("attendance_records").upsert(rows, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) return setError(error.message);
    setAlreadyMarked(rows.length);
    Alert.alert("Register saved", `${counts.present} present, ${counts.late} late, ${counts.absent} absent, ${counts.excused} excused.`);
  }

  const className = classes.find((c) => c.id === classId)?.name;

  return (
    <ToolScreen
      title="Class register"
      description="Everyone starts as present - tap anyone who's late, absent or excused, then save."
      footer={
        canWrite && students?.length ? (
          <Button size="lg" icon="check-circle" onPress={save} loading={saving}>
            {alreadyMarked ? "Update register" : "Save register"} ({students.length})
          </Button>
        ) : null
      }
    >
      {error && <ErrorBanner message={error} />}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Class">
            <Select value={classId} onChange={setClassId} options={classes.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select class…" allowClear={false} />
          </Field>
        </View>
        <View style={{ flex: 1.2 }}>
          <Field label="Date">
            <DateTimeField mode="date" value={date} onChange={(v) => setDate(v || localToday())} allowClear={false} />
          </Field>
        </View>
      </View>

      {students && students.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {STATUSES.map((s) => (
            <View key={s.value} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: s.color + "1c" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
              <Text style={{ fontSize: 13, color: colors.slate700, textTransform: "capitalize" }}>
                {s.value} <Text style={{ fontWeight: "700", color: colors.slate900 }}>{counts[s.value]}</Text>
              </Text>
            </View>
          ))}
          <Pressable
            onPress={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "present" as Status])))}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.oasis200 }}
          >
            <Text style={{ fontSize: 13, color: colors.oasis700, fontWeight: "600" }}>All present</Text>
          </Pressable>
        </View>
      )}

      {alreadyMarked > 0 && students?.length ? (
        <Text style={{ fontSize: 12.5, color: colors.slate500, marginBottom: 10 }}>
          {className} was already marked for this date - saving updates it.
        </Text>
      ) : null}

      <Card padded={false}>
        {!classId ? (
          <EmptyState icon="users" title="Choose a class" />
        ) : students === null ? (
          <Spinner />
        ) : students.length === 0 ? (
          <EmptyState icon="users" title="No active students in this class" description="Add students first, or bulk-add a whole class at once." />
        ) : (
          students.map((s, i) => {
            const current = marks[s.id] ?? "present";
            return (
              <View
                key={s.id}
                style={[
                  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
                  i > 0 && { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" },
                ]}
              >
                <Avatar name={s.full_name} size={34} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14.5, color: colors.slate800, fontWeight: "600" }} numberOfLines={1}>
                    {s.full_name}
                  </Text>
                  {s.admission_number ? <Text style={{ fontSize: 11.5, color: colors.slate400 }}>{s.admission_number}</Text> : null}
                </View>
                <View style={{ flexDirection: "row", gap: 5 }}>
                  {STATUSES.map((st) => {
                    const on = current === st.value;
                    return (
                      <Pressable
                        key={st.value}
                        disabled={!canWrite}
                        onPress={() => setMarks((m) => ({ ...m, [s.id]: st.value }))}
                        accessibilityLabel={`${s.full_name} ${st.value}`}
                        style={({ pressed }) => ({
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: on ? st.color : "rgba(255,255,255,0.7)",
                          borderWidth: on ? 0 : 1,
                          borderColor: "rgba(148,152,239,0.25)",
                          transform: [{ scale: pressed ? 0.9 : 1 }],
                        })}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "700", color: on ? "#fff" : colors.slate500 }}>{st.short}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </Card>
    </ToolScreen>
  );
}
