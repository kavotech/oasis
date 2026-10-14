"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/ui/Card";
import { Badge } from "@/components/portal/ui/Badge";
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

/** Daily register, the way schools run it (same as the mobile app): class and
 * subject teachers mark their own classes; the school admin doesn't take
 * registers but sees which classes are marked and by whom. */
export default function RegisterPage() {
  const { profile, user, role } = useAuth();
  const isAdmin = role === "school_admin";
  const { toast } = useToast();
  const { rows: classes } = useRealtimeRows<Tables<"classes">>("classes", "name");
  const [myClassIds, setMyClassIds] = useState<string[] | null>(null);
  const [formClassIds, setFormClassIds] = useState<string[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(localToday());
  const [students, setStudents] = useState<Student[] | null>(null);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [alreadyMarked, setAlreadyMarked] = useState(0);
  const [saving, setSaving] = useState(false);

  // Which classes this teacher may mark - the same rule the database enforces.
  useEffect(() => {
    if (!role || isAdmin) return setMyClassIds([]);
    const supabase = createClient();
    Promise.all([supabase.rpc("my_class_ids"), supabase.rpc("my_staff_id")]).then(async ([ids, staff]) => {
      setMyClassIds(((ids.data as string[] | null) ?? []).filter(Boolean));
      if (staff.data) {
        const { data } = await supabase.from("classes").select("id").eq("class_teacher_id", staff.data as string);
        setFormClassIds((data ?? []).map((c) => c.id));
      }
    });
  }, [role, isAdmin]);

  const classOptions = useMemo(() => {
    const sorted = [...classes].sort((a, b) => a.name.localeCompare(b.name));
    if (isAdmin) return sorted;
    return sorted.filter((c) => myClassIds?.includes(c.id)).sort((a, b) => Number(formClassIds.includes(b.id)) - Number(formClassIds.includes(a.id)));
  }, [classes, isAdmin, myClassIds, formClassIds]);

  useEffect(() => {
    if (!isAdmin && !classId && classOptions.length) setClassId(classOptions[0].id);
  }, [isAdmin, classId, classOptions]);

  // Deep links from the teacher dashboard: /dashboard/attendance/register?class=<id>
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("class");
    if (fromUrl) setClassId(fromUrl);
  }, []);

  const canWrite = role === "teacher" && classOptions.some((c) => c.id === classId);

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

  const className = classes.find((c) => c.id === classId)?.name;

  if (isAdmin && !classId) {
    return (
      <div>
        <PageHeader
          title="Registers"
          description="Class teachers take registers. Here's which classes are marked and by whom - click a class to see its marks."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Attendance", href: "/dashboard/attendance" }, { label: "Registers" }]}
        />
        <div className="mb-5 w-48">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value || localToday())} />
          </Field>
        </div>
        <RegisterOverview date={date} onOpen={setClassId} />
      </div>
    );
  }

  if (!isAdmin && myClassIds && classOptions.length === 0) {
    return (
      <div>
        <PageHeader title="Class register" breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Register" }]} />
        <Card>
          <p className="py-10 text-center text-sm text-slate-500">
            No classes are assigned to you yet. Ask your school admin to make you a class teacher or assign you subjects.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isAdmin ? `${className ?? "Class"} register` : "Class register"}
        description={isAdmin ? "View only - the class teacher takes this register." : "Everyone starts as present - click anyone who's late, absent or excused, then save."}
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
          {isAdmin ? (
            <Button variant="secondary" onClick={() => setClassId("")}>
              ← All classes
            </Button>
          ) : (
            <div className="w-56">
              <Field label="Class">
                <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {formClassIds.includes(c.id) ? " · your class" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
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
              {canWrite && (
                <Button variant="ghost" size="sm" onClick={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "present" as Status])))}>
                  Mark all present
                </Button>
              )}
            </div>
          )}
        </div>
        {students && students.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            {alreadyMarked
              ? isAdmin
                ? `${alreadyMarked} of ${students.length} marked for this date.`
                : "This class was already marked for this date - saving updates it."
              : isAdmin
                ? "Not marked yet for this date."
                : ""}
          </p>
        )}
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
                {canWrite ? (
                  <div className="flex gap-1.5">
                    {STATUSES.map((st) => (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => setMarks((m) => ({ ...m, [s.id]: st.value }))}
                        className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", current === st.value ? st.on : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Badge tone={!alreadyMarked ? "neutral" : current === "present" ? "success" : current === "absent" ? "danger" : current === "late" ? "warning" : "info"}>
                    {alreadyMarked ? current : "not marked"}
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

/** Admin view: every class with the day's register status. */
function RegisterOverview({ date, onOpen }: { date: string; onOpen: (id: string) => void }) {
  const { rows: classes } = useRealtimeRows<Tables<"classes">>("classes", "name");
  const { rows: students } = useRealtimeRows<Tables<"students">>("students", "full_name");
  const { rows: attendance } = useRealtimeRows<Tables<"attendance_records">>("attendance_records", "date");
  const { rows: staff } = useRealtimeRows<Tables<"staff">>("staff", "full_name");

  const staffName = new Map(staff.map((s) => [s.id, s.full_name]));
  const staffByProfile = new Map(staff.filter((s) => s.profile_id).map((s) => [s.profile_id!, s.full_name]));
  const classOf = new Map(students.map((s) => [s.id, s.class_id]));
  const rows = [...classes]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => {
      const total = students.filter((s) => s.class_id === c.id && s.status === "active").length;
      const marks = attendance.filter((a) => a.date === date && classOf.get(a.student_id) === c.id);
      const by = marks.find((m) => m.marked_by)?.marked_by;
      return {
        ...c,
        total,
        marked: marks.length,
        present: marks.filter((m) => m.status === "present" || m.status === "late").length,
        markedBy: by ? staffByProfile.get(by) ?? "a teacher" : null,
        teacher: c.class_teacher_id ? staffName.get(c.class_teacher_id) : null,
      };
    });
  const done = rows.filter((r) => r.total > 0 && r.marked >= r.total).length;

  return (
    <Card className="p-0">
      <div className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-800">
        {done} of {rows.length} classes marked
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-14 text-center text-sm text-slate-400">No classes yet - add them in School Setup.</p>
      ) : (
        rows.map((r) => {
          const complete = r.total > 0 && r.marked >= r.total;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpen(r.id)}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-3.5 text-left transition last:border-0 hover:bg-slate-50"
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", complete ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                {complete ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-800">{r.name}</span>
                <span className="block text-xs text-slate-500">
                  {complete
                    ? `${r.present}/${r.total} in · marked by ${r.markedBy ?? "class teacher"}`
                    : r.marked
                      ? `${r.marked}/${r.total} marked so far`
                      : `Not marked · ${r.teacher ? `class teacher ${r.teacher}` : "no class teacher assigned"}`}
                </span>
              </span>
            </button>
          );
        })
      )}
    </Card>
  );
}
