import { useEffect } from "react";
import { View } from "react-native";
import { useRealtimeRows } from "@/lib/useRealtimeRows";
import { Card, EmptyState, StatCard } from "@/components/ui";
import type { Tables } from "@/types/database.types";

function useRefetchOn(signal: number, ...refetchers: (() => unknown)[]) {
  useEffect(() => {
    if (signal) refetchers.forEach((r) => r());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);
}

function Grid({ children }: { children: React.ReactNode[] }) {
  const pairs: React.ReactNode[][] = [];
  for (let i = 0; i < children.length; i += 2) pairs.push(children.slice(i, i + 2));
  return (
    <View style={{ gap: 12 }}>
      {pairs.map((p, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12 }}>
          {p}
          {p.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

// Same numbers as app/dashboard/reporting on the website.
export function ReportingScreen({ refreshSignal }: { refreshSignal: number }) {
  const students = useRealtimeRows<Tables<"students">>("students");
  const attendance = useRealtimeRows<Tables<"attendance_records">>("attendance_records");
  const invoices = useRealtimeRows<Tables<"fee_invoices">>("fee_invoices");
  const assessments = useRealtimeRows<Tables<"assessments">>("assessments");
  const exams = useRealtimeRows<Tables<"exam_entries">>("exam_entries");
  const behaviour = useRealtimeRows<Tables<"behaviour_incidents">>("behaviour_incidents");
  useRefetchOn(refreshSignal, students.refetch, attendance.refetch, invoices.refetch, assessments.refetch, exams.refetch, behaviour.refetch);

  const today = new Date().toISOString().slice(0, 10);
  const presentToday = attendance.rows.filter((a) => a.date === today && a.status === "present").length;
  const outstanding = invoices.rows.filter((i) => i.status !== "paid");
  const outstandingTotal = outstanding.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <Grid>
      {[
        <StatCard key="s" label="Total Students" value={String(students.rows.length)} icon="users" accent="oasis" />,
        <StatCard key="p" label="Present Today" value={String(presentToday)} icon="check-square" accent="emerald" />,
        <StatCard key="o" label="Outstanding Invoices" value={String(outstanding.length)} icon="credit-card" accent="amber" trendLabel={`${outstandingTotal.toLocaleString()} total`} />,
        <StatCard key="a" label="Assessments Logged" value={String(assessments.rows.length)} icon="award" accent="sky" />,
        <StatCard key="e" label="Exam Entries" value={String(exams.rows.length)} icon="file-text" accent="oasis" />,
        <StatCard key="b" label="Behaviour Incidents" value={String(behaviour.rows.length)} icon="alert-triangle" accent="amber" />,
      ]}
    </Grid>
  );
}

// Same numbers as app/dashboard/school-analytics on the website.
export function AnalyticsScreen({ refreshSignal }: { refreshSignal: number }) {
  const attendance = useRealtimeRows<Tables<"attendance_records">>("attendance_records");
  const behaviour = useRealtimeRows<Tables<"behaviour_incidents">>("behaviour_incidents");
  const assessments = useRealtimeRows<Tables<"assessments">>("assessments");
  useRefetchOn(refreshSignal, attendance.refetch, behaviour.refetch, assessments.refetch);

  const present = attendance.rows.filter((a) => a.status === "present").length;
  const rate = attendance.rows.length ? Math.round((present / attendance.rows.length) * 100) : null;
  const positive = behaviour.rows.filter((b) => b.type === "positive").length;
  const negative = behaviour.rows.filter((b) => b.type === "negative").length;
  const scored = assessments.rows.filter((a) => a.score != null && a.max_score);
  const avg = scored.length ? Math.round(scored.reduce((sum, a) => sum + (a.score! / a.max_score) * 100, 0) / scored.length) : null;

  return (
    <View style={{ gap: 16 }}>
      <Grid>
        {[
          <StatCard
            key="r"
            label="Attendance Rate"
            value={rate != null ? `${rate}%` : "—"}
            icon="check-square"
            accent="emerald"
            trendLabel={attendance.rows.length ? `${attendance.rows.length} records` : "No records yet"}
          />,
          <StatCard key="b" label="Behaviour Points" value={`+${positive} / -${negative}`} icon="alert-triangle" accent="amber" />,
          <StatCard
            key="a"
            label="Average Assessment Score"
            value={avg != null ? `${avg}%` : "—"}
            icon="award"
            accent="sky"
            trendLabel={scored.length ? `${scored.length} scored` : "No scores yet"}
          />,
        ]}
      </Grid>
      <Card style={{ borderStyle: "dashed", backgroundColor: "rgba(248,250,252,0.6)" }}>
        <EmptyState icon="trending-up" title="Charts coming later" description="These numbers are real and live - visual graphs and year/class/house comparisons aren't built yet." />
      </Card>
    </View>
  );
}
