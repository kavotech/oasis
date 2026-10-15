"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card, CardHeader } from "@/components/portal/ui/Card";
import { Button } from "@/components/portal/ui/Button";
import { textareaClassName } from "@/components/school/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { friendlyDbError } from "@/lib/db-errors";
import { guardianKey, IMPORT_TEMPLATE, normPhone, parseStudentImport, type ImportGuardian } from "@/lib/import-students";
import type { Tables } from "@/types/database.types";

type Summary = { students: number; guardians: number; links: number; classes: number; streams: number; skipped: number };

/** Import a whole school's students and parents in one go. Parents shared
 * between siblings are created once and linked to every child. */
export default function ImportPage() {
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const { rows: students } = useRealtimeRows<Tables<"students">>("students", "full_name");
  const [text, setText] = useState("");
  const [createClasses, setCreateClasses] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const existing = useMemo(() => new Set(students.map((s) => s.admission_number?.toLowerCase()).filter(Boolean) as string[]), [students]);
  const parsed = useMemo(() => parseStudentImport(text, existing), [text, existing]);
  const valid = parsed.rows.filter((r) => !r.error);
  const parentCount = new Set(valid.flatMap((r) => r.guardians.map(guardianKey))).size;
  const classNames = Array.from(new Set(valid.map((r) => r.className).filter(Boolean) as string[]));

  async function run() {
    const schoolId = profile?.school_id;
    if (!schoolId || !valid.length) return;
    const supabase = createClient();
    setSummary(null);
    const s: Summary = { students: 0, guardians: 0, links: 0, classes: 0, streams: 0, skipped: parsed.rows.length - valid.length };
    try {
      // 1. Classes and streams.
      setRunning("Matching classes…");
      const { data: classRows } = await supabase.from("classes").select("id, name");
      const classByName = new Map((classRows ?? []).map((c) => [c.name.trim().toLowerCase(), c]));
      const missing = classNames.filter((n) => !classByName.has(n.toLowerCase()));
      if (missing.length && createClasses) {
        const { data, error } = await supabase.from("classes").insert(missing.map((name) => ({ school_id: schoolId, name }))).select("id, name");
        if (error) throw error;
        for (const c of data ?? []) classByName.set(c.name.trim().toLowerCase(), c);
        s.classes = data?.length ?? 0;
      }
      const { data: streamRows } = await supabase.from("streams").select("id, name, class_id");
      const streamKey = (classId: string, name: string) => `${classId}|${name.trim().toLowerCase()}`;
      const streamBy = new Map((streamRows ?? []).map((st) => [streamKey(st.class_id, st.name), st.id]));
      const neededStreams = new Map<string, { class_id: string; name: string }>();
      for (const r of valid) {
        const c = r.className ? classByName.get(r.className.toLowerCase()) : null;
        if (c && r.streamName && !streamBy.has(streamKey(c.id, r.streamName))) neededStreams.set(streamKey(c.id, r.streamName), { class_id: c.id, name: r.streamName });
      }
      if (neededStreams.size) {
        const { data, error } = await supabase.from("streams").insert([...neededStreams.values()].map((v) => ({ ...v, school_id: schoolId }))).select("id, name, class_id");
        if (error) throw error;
        for (const st of data ?? []) streamBy.set(streamKey(st.class_id, st.name), st.id);
        s.streams = data?.length ?? 0;
      }

      // 2. Parents/guardians - reuse existing ones (same phone or email), create the rest once.
      setRunning("Adding parents…");
      const { data: existingGuardians } = await supabase.from("guardians").select("id, full_name, phone, email");
      const guardianBy = new Map<string, string>();
      for (const g of existingGuardians ?? []) {
        if (g.phone) guardianBy.set(`p:${normPhone(g.phone)}`, g.id);
        if (g.email) guardianBy.set(`e:${g.email.toLowerCase()}`, g.id);
      }
      const toCreate = new Map<string, ImportGuardian>();
      for (const r of valid) for (const g of r.guardians) if (!guardianBy.has(guardianKey(g))) toCreate.set(guardianKey(g), g);
      const newGuardians = [...toCreate.entries()];
      for (let i = 0; i < newGuardians.length; i += 200) {
        const chunk = newGuardians.slice(i, i + 200);
        const { data, error } = await supabase
          .from("guardians")
          .insert(chunk.map(([, g]) => ({ school_id: schoolId, full_name: g.name, phone: g.phone, email: g.email, relationship: g.relationship, is_emergency_contact: true })))
          .select("id");
        if (error) throw error;
        (data ?? []).forEach((row, j) => guardianBy.set(chunk[j][0], row.id));
        s.guardians += data?.length ?? 0;
      }

      // 3. Students, in chunks.
      setRunning("Adding students…");
      const links: { school_id: string; student_id: string; guardian_id: string }[] = [];
      for (let i = 0; i < valid.length; i += 200) {
        const chunk = valid.slice(i, i + 200);
        const { data, error } = await supabase
          .from("students")
          .insert(
            chunk.map((r) => {
              const c = r.className ? classByName.get(r.className.toLowerCase()) : null;
              const g = r.guardians[0];
              return {
                school_id: schoolId,
                full_name: r.full_name,
                admission_number: r.admission_number,
                gender: r.gender,
                date_of_birth: r.date_of_birth,
                class_id: c?.id ?? null,
                form_class: c?.name ?? r.className,
                stream_id: c && r.streamName ? streamBy.get(streamKey(c.id, r.streamName)) ?? null : null,
                guardian_name: g?.name ?? null,
                guardian_phone: g?.phone ?? null,
                guardian_email: g?.email ?? null,
                status: "active",
              };
            })
          )
          .select("id");
        if (error) throw error;
        (data ?? []).forEach((row, j) => {
          for (const g of chunk[j].guardians) {
            const gid = guardianBy.get(guardianKey(g));
            if (gid) links.push({ school_id: schoolId, student_id: row.id, guardian_id: gid });
          }
        });
        s.students += data?.length ?? 0;
        setRunning(`Adding students… ${s.students}/${valid.length}`);
      }

      // 4. Parent ↔ child links.
      setRunning("Linking parents to children…");
      const uniqueLinks = [...new Map(links.map((l) => [`${l.student_id}|${l.guardian_id}`, l])).values()];
      for (let i = 0; i < uniqueLinks.length; i += 500) {
        const { error } = await supabase.from("student_guardians").insert(uniqueLinks.slice(i, i + 500));
        if (error) throw error;
      }
      s.links = uniqueLinks.length;
      setSummary(s);
      setText("");
      toast("success", "Import complete", `${s.students} students and ${s.guardians} new parents added.`);
    } catch (e) {
      toast("error", "Import stopped", friendlyDbError((e as Error).message) + " - anything listed below as added was saved.");
      setSummary(s);
    } finally {
      setRunning(null);
    }
  }

  if (role && role !== "school_admin") {
    return (
      <Card>
        <p className="py-10 text-center text-sm text-slate-500">Only school administrators can import data.</p>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Import students & parents"
        description="Paste your student list from Excel or Google Sheets, or upload a CSV. One row per student - a parent with several children just appears on each child's row and is linked to all of them."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "School Setup", href: "/dashboard/setup" }, { label: "Import" }]}
      />

      {summary && (
        <Card className="mb-5 border-emerald-200 bg-emerald-50/60">
          <p className="text-sm text-emerald-900">
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            Added <strong>{summary.students}</strong> students, <strong>{summary.guardians}</strong> new parents/guardians and <strong>{summary.links}</strong> parent–child
            links{summary.classes ? `, ${summary.classes} classes` : ""}
            {summary.streams ? `, ${summary.streams} streams` : ""}.{summary.skipped ? ` ${summary.skipped} rows with problems were skipped.` : ""}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Card className="space-y-3 xl:col-span-2">
          <CardHeader title="Your data" subtitle="Headings are recognised automatically: Name, Admission no, Class, Stream, Gender, Date of birth, Parent/Father, Mother, phones and emails." />
          <textarea
            className={`${textareaClassName} font-mono text-[12.5px]`}
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Copy your sheet (including the heading row) and paste it here…"
          />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setText(await f.text());
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Upload CSV
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const blob = new Blob([IMPORT_TEMPLATE], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "oasis-students-template.csv";
                a.click();
              }}
            >
              <Download className="h-3.5 w-3.5" /> Template
            </Button>
            {!text && (
              <Button size="sm" variant="ghost" onClick={() => setText(IMPORT_TEMPLATE)}>
                Try the example
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={createClasses} onChange={(e) => setCreateClasses(e.target.checked)} /> Create classes and streams that don&rsquo;t exist yet
          </label>
          <p className="text-xs text-slate-500">Have Excel files, PDFs or a folder of records instead? Upload them on the registration documents page and the OASIS team will import them for you.</p>
        </Card>

        <Card className="p-0 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {parsed.rows.length ? `${valid.length} students · ${parentCount} parents/guardians · ${classNames.length} classes` : "Preview"}
                {parsed.rows.length - valid.length > 0 && <span className="text-rose-600"> · {parsed.rows.length - valid.length} to fix</span>}
              </p>
              {parsed.columns.length > 0 && <p className="text-xs text-slate-500">Recognised: {parsed.columns.join(", ")}</p>}
              {parsed.unknown.length > 0 && <p className="text-xs text-amber-700">Ignored columns: {parsed.unknown.join(", ")}</p>}
            </div>
            <Button onClick={run} loading={!!running} disabled={!valid.length || !!running}>
              {running ?? `Import ${valid.length || ""} students`}
            </Button>
          </div>
          {parsed.rows.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-400">Paste or upload your list to preview it.</p>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5" />
                    <th className="px-2 py-2.5">Student</th>
                    <th className="px-2 py-2.5">Class</th>
                    <th className="px-2 py-2.5">Parents / guardians</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r) => (
                    <tr key={r.line} className="border-t border-slate-50 align-top">
                      <td className="px-4 py-2.5">{r.error ? <AlertCircle className="h-4 w-4 text-rose-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}</td>
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-slate-800">{r.full_name || <span className="text-slate-400">Line {r.line}</span>}</p>
                        <p className="text-xs text-slate-500">{[r.admission_number, r.gender, r.date_of_birth].filter(Boolean).join(" · ")}</p>
                        {r.error && <p className="text-xs text-rose-600">{r.error}</p>}
                      </td>
                      <td className="px-2 py-2.5 text-slate-600">{[r.className, r.streamName].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-2 py-2.5 text-xs text-slate-600">
                        {r.guardians.length
                          ? r.guardians.map((g, i) => (
                              <p key={i}>
                                {g.name}
                                {g.relationship ? ` (${g.relationship})` : ""} {g.phone ? `· ${g.phone}` : ""}
                              </p>
                            ))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
