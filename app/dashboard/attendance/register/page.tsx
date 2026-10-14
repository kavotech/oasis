"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/ui/Card";
import { Button } from "@/components/portal/ui/Button";
import { Input, Select } from "@/components/portal/ui/Input";
import { Avatar } from "@/components/portal/ui/Avatar";
import { Field } from "@/components/school/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { localToday } from "@/lib/bulk";
import { friendlyDbError } from "@/lib/db-errors";
import { cn } from "@/lib/utils/cn";
import type { Tables } from "@/types/database.types";

type Status = "present" | "late" | "absent" | "excused";
type Student = Pick<Tables<"students">, "id" | "full_name" | "admission_number">;

const STATUSES: { value: Status; label: string; on: string }[] = [
  { value: "present", label: "Present", on: "bg-emerald-500 text-white" },
  { value: "late", label: "Late", on: "bg-amber-500 text-white" },
  { value: "absent", label: "Absent", on: "bg-rose-500 text-white" },
  { value: "excused", label: "Excused", on: "bg-oasis-500 text-white" },
];

/** Whole-class register (same as the mobile app's): everyone starts Present,
 * click the exceptions, save once. Upserts on (student_id, date). */
export default function RegisterPage() {
  const { profile, user, role } = useAuth();
  const { toast } = useToast();
  const { rows: classes } = useRealtimeRows<Tables<"classes">>("classes", "name");
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(localToday());
  const [students, setStudents] = useState<Student[] | null>(null);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [alreadyMarked, setAlreadyMarked] = useState(0);
  const [saving, setSaving] = useState(false);
  const canWrite = role === "school_admin" || role === "teacher";
  const sortedClasses = useMemo(() => [...classes].sort((a, b) => a.name.localeCompare(b.name)), [classes]);

  useEffect(() => {
    if (!classId && sortedClasses.length) setClassId(sortedClasses[0].id);
  }, [sortedClasses, classId]);

  useEffect(() => {
    if (!classId || !date) return;
    let active = true;
    setStudents(null);
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("students").select("id, full_name, admission_number").eq("class_id", classId).eq("status", "active").order("full_name");
      if (!active) return;
      if (error) {
        toast("error", "Couldn't load the class", friendlyDbError(error.message));
        return setStudents([]);
      }
      const list = data ?? [];
      const existing = list.length ? (await supabase.from("attendance_records").select("student_id, status").eq("date", date).in("student_id", list.map((s) => s.id))).data ?? [] : [];
      if (!active) return;
      const next: Record<string, Status> = {};
      for (const s of list) next[s.id] = "present";
      for (const r of existing) next[r.student_id] = r.status as Status;
      setMarks(next);
      setAlreadyMarked(existing.length);
      setStudents(list);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { present: 0, late: 0, absent: 0, excused: 0 };
    for (const s of students ?? []) c[marks[s.id] ?? "present"]++;
    return c;
  }, [students, marks]);

  async function save() {
    if (!profile?.school_id || !students?.length) return;
    setSaving(true);
    const { error } = await createClient()
      .from("attendance_records")
      .upsert(
        students.map((s) => ({ school_id: profile.school_id!, student_id: s.id, date, status: marks[s.id] ?? "present", marked_by: user?.id ?? null })),
        { onConflict: "student_id,date" }
      );
    setSaving(false);
    if (error) return toast("error", "Couldn't save the register", friendlyDbError(error.message));
    setAlreadyMarked(students.length);
    toast("success", "Register saved", `${counts.present} present, ${counts.late} late, ${counts.absent} absent, ${counts.excused} excused.`);
  }

  return (
    <div>
      <PageHeader
        title="Class register"
        description="Everyone starts as present - click anyone who's late, absent or excused, then save."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Attendance", href: "/dashboard/attendance" }, { label: "Register" }]}
        action={
          canWrite &&
          !!students?.length && (
            <Button onClick={save} loading={saving}>
              <ClipboardCheck className="h-4 w-4" /> {alreadyMarked ? "Update register" : "Save register"} ({students.length})
            </Button>
          )
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <Field label="Class">
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                {sortedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="w-48">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value || localToday())} />
            </Field>
          </div>
          {students && students.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {STATUSES.map((s) => (
                <span key={s.value} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {s.label} <span className="text-slate-900">{counts[s.value]}</span>
                </span>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "present" as Status])))}>
                Mark all present
              </Button>
            </div>
          )}
        </div>
        {alreadyMarked > 0 && <p className="mt-3 text-xs text-slate-500">This class was already marked for this date - saving updates it.</p>}
      </Card>

      <Card className="p-0">
        {students === null ? (
          <p className="px-5 py-14 text-center text-sm text-slate-400">{classId ? "Loading class…" : "Choose a class."}</p>
        ) : students.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-slate-400">No active students in this class.</p>
        ) : (
          students.map((s) => {
            const current = marks[s.id] ?? "present";
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-0">
                <Avatar name={s.full_name} size={34} />
                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-semibold text-slate-800">{s.full_name}</p>
                  {s.admission_number && <p className="text-xs text-slate-400">{s.admission_number}</p>}
                </div>
                <div className="flex gap-1.5">
                  {STATUSES.map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      disabled={!canWrite}
                      onClick={() => setMarks((m) => ({ ...m, [s.id]: st.value }))}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                        current === st.value ? st.on : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      )}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
