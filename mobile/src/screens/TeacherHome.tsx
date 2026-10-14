import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { localToday } from "@/lib/bulk";
import { colors } from "@/theme";

type ClassRow = { id: string; name: string; total: number; marked: number; isForm: boolean };
type Lesson = { id: string; subject: string; class_name: string; start_time: string; end_time: string; room: string | null };

/** A teacher's home: their own class register first, then today's lessons and
 * the other classes they teach. School-wide figures stay with the admin. */
export function TeacherHome({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const load = useCallback(async () => {
    const today = localToday();
    const isoDay = ((new Date().getDay() + 6) % 7) + 1; // Mon=1..Sun=7
    const [{ data: staffId }, { data: ids }] = await Promise.all([supabase.rpc("my_staff_id"), supabase.rpc("my_class_ids")]);
    const classIds = ((ids as string[]) ?? []).filter(Boolean);
    const [classRes, studentRes, lessonRes] = await Promise.all([
      classIds.length ? supabase.from("classes").select("id, name, class_teacher_id").in("id", classIds).order("name") : Promise.resolve({ data: [] }),
      classIds.length ? supabase.from("students").select("id, class_id").in("class_id", classIds).eq("status", "active") : Promise.resolve({ data: [] }),
      user ? supabase.from("timetable_entries").select("id, subject, class_name, start_time, end_time, room").eq("teacher_id", user.id).eq("day_of_week", isoDay).order("start_time") : Promise.resolve({ data: [] }),
    ]);
    const students = (studentRes.data as { id: string; class_id: string }[]) ?? [];
    const marks = students.length
      ? (((await supabase.from("attendance_records").select("student_id").eq("date", today).in("student_id", students.map((s) => s.id))).data as { student_id: string }[]) ?? [])
      : [];
    const markedSet = new Set(marks.map((m) => m.student_id));
    const rows = ((classRes.data as { id: string; name: string; class_teacher_id: string | null }[]) ?? []).map((c) => {
      const inClass = students.filter((s) => s.class_id === c.id);
      return { id: c.id, name: c.name, total: inClass.length, marked: inClass.filter((s) => markedSet.has(s.id)).length, isForm: c.class_teacher_id === staffId };
    });
    rows.sort((a, b) => Number(b.isForm) - Number(a.isForm));
    setClasses(rows);
    setLessons(((lessonRes.data as Lesson[]) ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time)));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load, refreshKey])
  );

  if (!classes) return null;

  if (!classes.length) {
    return (
      <Card style={{ marginBottom: 24 }}>
        <EmptyState
          icon="users"
          title="No classes assigned yet"
          description="Your school admin assigns class teachers and subject teachers. Once you're assigned, your classes and registers appear here."
        />
      </Card>
    );
  }

  const form = classes.filter((c) => c.isForm);
  const others = classes.filter((c) => !c.isForm);

  return (
    <>
      {form.map((c) => {
        const done = c.total > 0 && c.marked >= c.total;
        return (
          <View key={c.id} style={{ marginBottom: 24 }}>
            <SectionTitle title="Your class" />
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(148,152,239,0.18)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: colors.oasis700 }}>{c.name}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.slate900 }}>{c.total} students</Text>
                  <Text style={{ fontSize: 13, color: done ? "#059669" : "#b45309", marginTop: 2 }}>
                    {done ? "Today's register is done" : c.marked ? `${c.marked}/${c.total} marked today` : "Today's register isn't taken yet"}
                  </Text>
                </View>
              </View>
              <Button style={{ marginTop: 14 }} variant={done ? "secondary" : "primary"} icon="check-circle" onPress={() => router.push(`/modules/register?class=${c.id}`)}>
                {done ? "Review register" : "Take register"}
              </Button>
            </Card>
          </View>
        );
      })}

      <SectionTitle title="Today's lessons" />
      <Card padded={false} style={{ marginBottom: 24 }}>
        {lessons.length === 0 ? (
          <EmptyState icon="clock" title="No lessons on your timetable today" />
        ) : (
          lessons.map((l, i) => (
            <View key={l.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 }, i > 0 && { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" }]}>
              <View style={{ width: 54, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.slate900 }}>{l.start_time.slice(0, 5)}</Text>
                <Text style={{ fontSize: 11, color: colors.slate400 }}>{l.end_time.slice(0, 5)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.slate800 }}>{l.subject}</Text>
                <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 1 }}>{[l.class_name, l.room ? `Room ${l.room}` : null].filter(Boolean).join(" · ")}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      {others.length > 0 && (
        <>
          <SectionTitle title="Classes you teach" />
          <Card padded={false} style={{ marginBottom: 24 }}>
            {others.map((c, i) => (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/modules/register?class=${c.id}`)}
                style={({ pressed }) => [
                  { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
                  i > 0 && { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" },
                  pressed && { backgroundColor: "rgba(148,152,239,0.12)" },
                ]}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(148,152,239,0.16)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.oasis700 }}>{c.name}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.slate800 }}>{c.total} students</Text>
                <Badge tone={c.total && c.marked >= c.total ? "success" : "neutral"}>{c.total && c.marked >= c.total ? "Marked" : "Open"}</Badge>
                <Feather name="chevron-right" size={18} color={colors.slate300} />
              </Pressable>
            ))}
          </Card>
        </>
      )}
    </>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={{ fontSize: 19, fontWeight: "800", letterSpacing: -0.4, color: colors.slate900, marginBottom: 10, paddingHorizontal: 2 }}>{title}</Text>;
}
