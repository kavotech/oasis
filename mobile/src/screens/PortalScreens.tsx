import { useEffect } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useRealtimeRows } from "@/lib/useRealtimeRows";
import { Badge, Card, CardHeader, EmptyState, Spinner } from "@/components/ui";
import { colors } from "@/theme";
import type { Tables } from "@/types/database.types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Line({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 7 }}>
      <Text style={{ flex: 1, fontSize: 14, color: colors.slate600 }} numberOfLines={2}>
        {left}
      </Text>
      {right}
    </View>
  );
}

function None() {
  return <Text style={{ fontSize: 13, color: colors.slate400, paddingVertical: 6 }}>Nothing yet.</Text>;
}

/** Parents Portal / Student Portal - children linked by guardian_profile_id
 * or the student's own student_profile_id, exactly as on the website. */
export function PortalScreen({ kind, refreshSignal }: { kind: "parent" | "student"; refreshSignal: number }) {
  const { user } = useAuth();
  const students = useRealtimeRows<Tables<"students">>("students", "full_name");
  const attendance = useRealtimeRows<Tables<"attendance_records">>("attendance_records", "date", kind === "parent");
  const behaviour = useRealtimeRows<Tables<"behaviour_incidents">>("behaviour_incidents", "created_at", kind === "parent");
  const invoices = useRealtimeRows<Tables<"fee_invoices">>("fee_invoices", "created_at", kind === "parent");
  const homework = useRealtimeRows<Tables<"homework">>("homework", "due_date", kind === "student");
  const timetable = useRealtimeRows<Tables<"timetable_entries">>("timetable_entries", "day_of_week", kind === "student");
  const assessments = useRealtimeRows<Tables<"assessments">>("assessments", "created_at", kind === "student");

  useEffect(() => {
    if (!refreshSignal) return;
    [students, attendance, behaviour, invoices, homework, timetable, assessments].forEach((h) => h.refetch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const mine = students.rows.filter((s) => (kind === "parent" ? s.guardian_profile_id === user?.id : s.student_profile_id === user?.id));

  if (students.loading) return <Spinner />;
  if (mine.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={kind === "parent" ? "heart" : "user"}
          title={kind === "parent" ? "No child linked to your account yet" : "No student record linked yet"}
          description={
            kind === "parent"
              ? "Ask your school admin to link your account to your child's student record."
              : "Ask your school admin to link your account to your student record."
          }
        />
      </Card>
    );
  }

  return (
    <View style={{ gap: 24 }}>
      {mine.map((child) => (
        <View key={child.id} style={{ gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.slate800 }}>{child.full_name}</Text>
          {kind === "parent" ? (
            <>
              <Card>
                <CardHeader title="Recent attendance" />
                {attendance.rows.filter((a) => a.student_id === child.id).slice(0, 5).map((a) => (
                  <Line key={a.id} left={a.date} right={<Badge tone={a.status === "present" ? "success" : "warning"}>{a.status}</Badge>} />
                ))}
                {!attendance.rows.some((a) => a.student_id === child.id) && <None />}
              </Card>
              <Card>
                <CardHeader title="Behaviour" />
                {behaviour.rows.filter((b) => b.student_id === child.id).slice(0, 5).map((b) => (
                  <Line key={b.id} left={b.description} right={<Badge tone={b.type === "positive" ? "success" : "danger"}>{b.type}</Badge>} />
                ))}
                {!behaviour.rows.some((b) => b.student_id === child.id) && <None />}
              </Card>
              <Card>
                <CardHeader title="Fees" />
                {invoices.rows.filter((i) => i.student_id === child.id).slice(0, 5).map((i) => (
                  <Line
                    key={i.id}
                    left={`${i.description} · ${Number(i.amount).toLocaleString()}`}
                    right={<Badge tone={i.status === "paid" ? "success" : "warning"}>{i.status}</Badge>}
                  />
                ))}
                {!invoices.rows.some((i) => i.student_id === child.id) && <None />}
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader title="Homework" />
                {homework.rows
                  .filter((h) => h.class_name === child.form_class)
                  .slice(0, 6)
                  .map((h) => (
                    <Line key={h.id} left={`${h.subject} · ${h.title}`} right={h.due_date ? <Badge tone="info">{`Due ${h.due_date}`}</Badge> : undefined} />
                  ))}
                {!homework.rows.some((h) => h.class_name === child.form_class) && <None />}
              </Card>
              <Card>
                <CardHeader title="Timetable" />
                {timetable.rows
                  .filter((t) => t.class_name === child.form_class)
                  .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                  .map((t) => (
                    <Line key={t.id} left={`${DAYS[t.day_of_week - 1] ?? ""} ${t.start_time.slice(0, 5)} · ${t.subject}`} right={t.room ? <Badge>{t.room}</Badge> : undefined} />
                  ))}
                {!timetable.rows.some((t) => t.class_name === child.form_class) && <None />}
              </Card>
              <Card>
                <CardHeader title="Results" />
                {assessments.rows.filter((a) => a.student_id === child.id).slice(0, 6).map((a) => (
                  <Line key={a.id} left={`${a.subject}${a.term ? ` · ${a.term}` : ""}`} right={<Badge tone="info">{`${a.score ?? "—"} / ${a.max_score}`}</Badge>} />
                ))}
                {!assessments.rows.some((a) => a.student_id === child.id) && <None />}
              </Card>
            </>
          )}
        </View>
      ))}
    </View>
  );
}
