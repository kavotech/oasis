"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Card } from "@/components/portal/ui/Card";
import { Badge } from "@/components/portal/ui/Badge";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { localToday } from "@/lib/bulk";
import type { Tables } from "@/types/database.types";

/** A teacher's dashboard (mirrors the mobile app's TeacherHome): their own
 * class register first, today's lessons, then the other classes they teach. */
export function TeacherHome() {
  const { user } = useAuth();
  const [ids, setIds] = useState<{ classIds: string[]; staffId: string | null } | null>(null);
  const { rows: classes } = useRealtimeRows<Tables<"classes">>("classes", "name");
  const { rows: students } = useRealtimeRows<Tables<"students">>("students", "full_name");
  const { rows: attendance } = useRealtimeRows<Tables<"attendance_records">>("attendance_records", "date");
  const { rows: timetable } = useRealtimeRows<Tables<"timetable_entries">>("timetable_entries", "day_of_week");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([supabase.rpc("my_class_ids"), supabase.rpc("my_staff_id")]).then(([c, s]) =>
      setIds({ classIds: ((c.data as string[] | null) ?? []).filter(Boolean), staffId: (s.data as string | null) ?? null })
    );
  }, []);

  if (!ids) return null;
  const today = localToday();
  const isoDay = ((new Date().getDay() + 6) % 7) + 1;
  const mine = classes
    .filter((c) => ids.classIds.includes(c.id))
    .map((c) => {
      const inClass = students.filter((s) => s.class_id === c.id && s.status === "active");
      const ids2 = new Set(inClass.map((s) => s.id));
      const marked = attendance.filter((a) => a.date === today && ids2.has(a.student_id)).length;
      return { ...c, total: inClass.length, marked, isForm: c.class_teacher_id === ids.staffId };
    })
    .sort((a, b) => Number(b.isForm) - Number(a.isForm) || a.name.localeCompare(b.name));
  const lessons = timetable.filter((t) => t.teacher_id === user?.id && t.day_of_week === isoDay).sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (!mine.length) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-slate-500">
          No classes are assigned to you yet. Your school admin assigns class teachers and subject teachers - your classes and registers will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Your classes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mine.map((c) => {
            const done = c.total > 0 && c.marked >= c.total;
            return (
              <Card key={c.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-oasis-50 text-sm font-extrabold text-oasis-700">{c.name}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {c.total} students {c.isForm && <Badge tone="info">Your class</Badge>}
                    </p>
                    <p className={done ? "text-xs text-emerald-600" : "text-xs text-amber-700"}>
                      {done ? "Today's register is done" : c.marked ? `${c.marked}/${c.total} marked today` : "Today's register isn't taken yet"}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/attendance/register?class=${c.id}`}
                  className={
                    done
                      ? "flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      : "flex h-10 items-center justify-center gap-2 rounded-xl bg-oasis-500 text-sm font-semibold text-white hover:bg-oasis-600"
                  }
                >
                  <ClipboardCheck className="h-4 w-4" /> {done ? "Review register" : "Take register"}
                </Link>
              </Card>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Today&rsquo;s lessons</h2>
        <Card className="p-0">
          {lessons.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">No lessons on your timetable today.</p>
          ) : (
            lessons.map((l) => (
              <div key={l.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-0">
                <div className="w-14 text-center">
                  <p className="text-sm font-bold text-slate-900">{l.start_time.slice(0, 5)}</p>
                  <p className="text-[11px] text-slate-400">{l.end_time.slice(0, 5)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{l.subject}</p>
                  <p className="text-xs text-slate-500">{[l.class_name, l.room ? `Room ${l.room}` : null].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}
