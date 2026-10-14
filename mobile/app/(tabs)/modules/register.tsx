import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { ToolScreen, useClasses } from "@/components/ToolScreen";
import { Avatar, Badge, Button, Card, DateTimeField, EmptyState, ErrorBanner, Field, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useMyClasses } from "@/lib/useMyClasses";
import { supabase } from "@/lib/supabase";
import { localToday } from "@/lib/bulk";
import { friendlyDbError } from "@/lib/db-errors";
import { colors } from "@/theme";

type Status = "present" | "late" | "absent" | "excused";
type Student = { id: string; full_name: string; admission_number: string | null };

const STATUSES: { value: Status; short: string; color: string }[] = [
  { value: "present", short: "P", color: "#10b981" },
  { value: "late", short: "L", color: "#f59e0b" },
  { value: "absent", short: "A", color: "#f43f5e" },
  { value: "excused", short: "E", color: "#9498ef" },
];

/** Daily register, the way schools run it: class teachers (and subject
 * teachers) mark their own classes; the school admin doesn't take registers
 * but sees which classes are marked, by whom, and can open any of them. */
export default function Register() {
  const { profile, user, role } = useAuth();
  const isAdmin = role === "school_admin";
  const params = useLocalSearchParams<{ class?: string }>();
  const { classes } = useClasses();
  const mine = useMyClasses();
  const [classId, setClassId] = useState(params.class ?? "");
  const [date, setDate] = useState(localToday());
  const [students, setStudents] = useState<Student[] | null>(null);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [alreadyMarked, setAlreadyMarked] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Teachers only ever see their own classes, their form class first.
  const classOptions = useMemo(() => {
    if (isAdmin) return classes;
    const own = classes.filter((c) => mine.classIds.includes(c.id));
    return [...own].sort((a, b) => Number(mine.formClassIds.includes(b.id)) - Number(mine.formClassIds.includes(a.id)));
  }, [isAdmin, classes, mine.classIds, mine.formClassIds]);

  useEffect(() => {
    if (!isAdmin && !classId && classOptions.length) setClassId(classOptions[0].id);
  }, [isAdmin, classId, classOptions]);

  const canWrite = role === "teacher" && classOptions.some((c) => c.id === classId);

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
      if (e1) return setError(friendlyDbError(e1.message));
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
    if (error) return setError(friendlyDbError(error.message));
    setAlreadyMarked(rows.length);
    Alert.alert("Register saved", `${counts.present} present, ${counts.late} late, ${counts.absent} absent, ${counts.excused} excused.`);
  }

  const className = classes.find((c) => c.id === classId)?.name;

  if (isAdmin && !classId) {
    return (
      <ToolScreen title="Registers" description="Class teachers take registers. Here's who has marked today - tap a class to see its marks.">
        <View style={{ width: 200 }}>
          <Field label="Date">
            <DateTimeField mode="date" value={date} onChange={(v) => setDate(v || localToday())} allowClear={false} />
          </Field>
        </View>
        <RegisterOverview date={date} onOpen={setClassId} />
      </ToolScreen>
    );
  }

  if (!isAdmin && !mine.loading && classOptions.length === 0) {
    return (
      <ToolScreen title="Class register">
        <Card>
          <EmptyState
            icon="users"
            title="No classes assigned to you yet"
            description="Ask your school admin to make you a class teacher or assign you subjects - your classes will appear here."
          />
        </Card>
      </ToolScreen>
    );
  }

  return (
    <ToolScreen
      title={isAdmin ? `${className ?? "Class"} register` : "Class register"}
      description={
        isAdmin
          ? "View only - the class teacher takes this register."
          : "Everyone starts as present - tap anyone who's late, absent or excused, then save."
      }
      footer={
        canWrite && students?.length ? (
          <Button size="lg" icon="check-circle" onPress={save} loading={saving}>
            {alreadyMarked ? "Update register" : "Save register"} ({students.length})
          </Button>
        ) : null
      }
    >
      {error && <ErrorBanner message={error} />}
      {isAdmin && (
        <Pressable onPress={() => setClassId("")} style={{ alignSelf: "flex-start", marginBottom: 12 }}>
          <Text style={{ color: colors.oasis600, fontWeight: "600" }}>← All classes</Text>
        </Pressable>
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {!isAdmin && (
          <View style={{ flex: 1 }}>
            <Field label="Class">
              <Select
                value={classId}
                onChange={setClassId}
                options={classOptions.map((c) => ({ value: c.id, label: mine.formClassIds.includes(c.id) ? `${c.name} · your class` : c.name }))}
                placeholder="Select class…"
                allowClear={false}
              />
            </Field>
          </View>
        )}
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
          {canWrite && (
            <Pressable
              onPress={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "present" as Status])))}
              style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.oasis200 }}
            >
              <Text style={{ fontSize: 13, color: colors.oasis700, fontWeight: "600" }}>All present</Text>
            </Pressable>
          )}
        </View>
      )}

      {alreadyMarked > 0 && students?.length ? (
        <Text style={{ fontSize: 12.5, color: colors.slate500, marginBottom: 10 }}>
          {isAdmin ? `${alreadyMarked} of ${students.length} marked for this date.` : `${className} was already marked for this date - saving updates it.`}
        </Text>
      ) : isAdmin && students?.length ? (
        <Text style={{ fontSize: 12.5, color: "#b45309", marginBottom: 10 }}>Not marked yet for this date.</Text>
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
                {canWrite ? (
                  <View style={{ flexDirection: "row", gap: 5 }}>
                    {STATUSES.map((st) => {
                      const on = current === st.value;
                      return (
                        <Pressable
                          key={st.value}
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
                ) : (
                  <Badge tone={current === "present" ? "success" : current === "absent" ? "danger" : current === "late" ? "warning" : "info"}>
                    {alreadyMarked ? current : "—"}
                  </Badge>
                )}
              </View>
            );
          })
        )}
      </Card>
    </ToolScreen>
  );
}

type ClassStatus = { id: string; name: string; total: number; marked: number; present: number; markedBy: string | null; teacher: string | null };

/** Admin view: every class with today's register status. */
function RegisterOverview({ date, onOpen }: { date: string; onOpen: (classId: string) => void }) {
  const [rows, setRows] = useState<ClassStatus[] | null>(null);

  useEffect(() => {
    let active = true;
    setRows(null);
    (async () => {
      const [classes, students, marks, staff, profiles] = await Promise.all([
        supabase.from("classes").select("id, name, class_teacher_id").order("name"),
        supabase.from("students").select("id, class_id").eq("status", "active"),
        supabase.from("attendance_records").select("student_id, status, marked_by").eq("date", date),
        supabase.from("staff").select("id, full_name"),
        supabase.from("profiles").select("id, full_name"),
      ]);
      const classOf = new Map(((students.data as { id: string; class_id: string | null }[]) ?? []).map((s) => [s.id, s.class_id]));
      const staffName = new Map(((staff.data as { id: string; full_name: string }[]) ?? []).map((s) => [s.id, s.full_name]));
      const profileName = new Map(((profiles.data as { id: string; full_name: string | null }[]) ?? []).map((p) => [p.id, p.full_name]));
      const out = ((classes.data as { id: string; name: string; class_teacher_id: string | null }[]) ?? []).map((c) => {
        const inClass = ((students.data as { id: string; class_id: string | null }[]) ?? []).filter((s) => s.class_id === c.id);
        const classMarks = ((marks.data as { student_id: string; status: string; marked_by: string | null }[]) ?? []).filter((m) => classOf.get(m.student_id) === c.id);
        const by = classMarks.find((m) => m.marked_by)?.marked_by ?? null;
        return {
          id: c.id,
          name: c.name,
          total: inClass.length,
          marked: classMarks.length,
          present: classMarks.filter((m) => m.status === "present" || m.status === "late").length,
          markedBy: by ? profileName.get(by) ?? "a teacher" : null,
          teacher: c.class_teacher_id ? staffName.get(c.class_teacher_id) ?? null : null,
        };
      });
      if (active) setRows(out);
    })();
    return () => {
      active = false;
    };
  }, [date]);

  if (!rows) return <Spinner />;
  if (!rows.length) return <Card><EmptyState icon="layers" title="No classes yet" description="Add classes in School Setup first." /></Card>;

  const done = rows.filter((r) => r.total > 0 && r.marked >= r.total).length;
  return (
    <>
      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginBottom: 10 }}>
        {done} of {rows.length} classes marked
      </Text>
      <Card padded={false}>
        {rows.map((r, i) => {
          const complete = r.total > 0 && r.marked >= r.total;
          return (
            <Pressable
              key={r.id}
              onPress={() => onOpen(r.id)}
              style={({ pressed }) => [
                { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
                i > 0 && { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" },
                pressed && { backgroundColor: "rgba(148,152,239,0.12)" },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: complete ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                }}
              >
                <Feather name={complete ? "check" : "clock"} size={18} color={complete ? "#059669" : "#b45309"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.slate800 }}>{r.name}</Text>
                <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 2 }}>
                  {complete
                    ? `${r.present}/${r.total} in · marked by ${r.markedBy ?? "class teacher"}`
                    : r.marked
                      ? `${r.marked}/${r.total} marked so far`
                      : `Not marked · ${r.teacher ? `class teacher ${r.teacher}` : "no class teacher assigned"}`}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.slate300} />
            </Pressable>
          );
        })}
      </Card>
    </>
  );
}
