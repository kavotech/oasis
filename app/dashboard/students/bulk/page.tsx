"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Upload, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/ui/Card";
import { Button } from "@/components/portal/ui/Button";
import { Select } from "@/components/portal/ui/Input";
import { Field, textareaClassName } from "@/components/school/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { BULK_STUDENTS_EXAMPLE, parseStudentLines } from "@/lib/bulk";
import { friendlyDbError } from "@/lib/db-errors";
import type { Tables } from "@/types/database.types";

/** Paste a class list (or upload a CSV), pick the class once, preview, and
 * create every student in one insert. Same parser as the mobile app. */
export default function BulkStudentsPage() {
  const router = useRouter();
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const { rows: classes } = useRealtimeRows<Tables<"classes">>("classes", "name");
  const { rows: streams } = useRealtimeRows<Tables<"streams">>("streams", "name");
  const { rows: students } = useRealtimeRows<Tables<"students">>("students", "full_name");
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canWrite = role === "school_admin" || role === "teacher";

  const existing = useMemo(() => new Set(students.map((s) => s.admission_number?.toLowerCase()).filter(Boolean) as string[]), [students]);
  const parsed = useMemo(() => parseStudentLines(text, existing), [text, existing]);
  const valid = parsed.filter((r) => !r.error);
  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name));
  const classStreams = streams.filter((s) => s.class_id === classId);
  const className = classes.find((c) => c.id === classId)?.name ?? null;

  async function save() {
    if (!profile?.school_id || !valid.length) return;
    if (!classId) {
      toast("error", "Choose a class", "Pick the class these students are joining.");
      return;
    }
    setSaving(true);
    const { error } = await createClient()
      .from("students")
      .insert(
        valid.map((r) => ({
          school_id: profile.school_id!,
          full_name: r.full_name,
          admission_number: r.admission_number,
          gender: r.gender,
          date_of_birth: r.date_of_birth,
          class_id: classId,
          form_class: className,
          stream_id: streamId || null,
          status: "active",
        }))
      );
    setSaving(false);
    if (error) {
      toast("error", "Couldn't add students", friendlyDbError(error.message));
      return;
    }
    toast("success", `${valid.length} students added`, `Added to ${className}.`);
    router.push("/dashboard/students");
  }

  return (
    <div>
      <PageHeader
        title="Bulk add students"
        description="Paste a class list or upload a CSV - one student per line. Copy straight from Excel or Google Sheets."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Student Management", href: "/dashboard/students" }, { label: "Bulk add" }]}
      />

      {!canWrite ? (
        <Card>
          <p className="py-8 text-center text-sm text-slate-500">Only School Admins and Teachers can add students.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <Card className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Class *">
                <Select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setStreamId("");
                  }}
                >
                  <option value="">Select class…</option>
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Stream">
                <Select value={streamId} onChange={(e) => setStreamId(e.target.value)} disabled={!classId}>
                  <option value="">{classId ? "Optional…" : "Pick class first"}</option>
                  {classStreams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Students">
              <textarea
                className={`${textareaClassName} font-mono text-[13px]`}
                rows={12}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Amina Nakato, ODS/2026/101, F, 14/03/2012\nBrian Okello, ODS/2026/102, M, 02/11/2011"}
              />
            </Field>
            <p className="text-xs text-slate-500">Columns: Full name, Admission no, Gender (M/F), Date of birth (DD/MM/YYYY). Only the name is required.</p>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setText(await file.text());
                  e.target.value = "";
                }}
              />
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Upload CSV
              </Button>
              {!text && (
                <Button variant="ghost" size="sm" onClick={() => setText(BULK_STUDENTS_EXAMPLE)}>
                  Fill in an example
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-0 lg:col-span-3">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <p className="text-sm font-semibold text-slate-800">
                Preview{parsed.length ? ` · ${valid.length} ready` : ""}
                {parsed.length - valid.length ? <span className="text-rose-600"> · {parsed.length - valid.length} to fix</span> : null}
              </p>
              <Button size="sm" onClick={save} loading={saving} disabled={!valid.length}>
                <UserPlus className="h-3.5 w-3.5" /> Add {valid.length || ""} student{valid.length === 1 ? "" : "s"}
              </Button>
            </div>
            {parsed.length === 0 ? (
              <p className="px-5 py-14 text-center text-sm text-slate-400">Paste or upload a list to preview it here.</p>
            ) : (
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-5 py-2.5" />
                      <th className="px-2 py-2.5">Name</th>
                      <th className="px-2 py-2.5">Admission no.</th>
                      <th className="px-2 py-2.5">Gender</th>
                      <th className="px-2 py-2.5">Date of birth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((r, i) => (
                      <tr key={`${r.line}-${i}`} className="border-t border-slate-50">
                        <td className="px-5 py-2.5">
                          {r.error ? <AlertCircle className="h-4 w-4 text-rose-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        </td>
                        <td className="px-2 py-2.5 font-medium text-slate-800">
                          {r.full_name || <span className="text-slate-400">Line {r.line}</span>}
                          {r.error && <p className="text-xs font-normal text-rose-600">{r.error}</p>}
                        </td>
                        <td className="px-2 py-2.5 text-slate-600">{r.admission_number ?? "—"}</td>
                        <td className="px-2 py-2.5 capitalize text-slate-600">{r.gender ?? "—"}</td>
                        <td className="px-2 py-2.5 text-slate-600">{r.date_of_birth ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
