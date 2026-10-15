"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/portal/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { importExtraction, readFileWithAi, type ExtractCounts, type Extracted, type ImportResult } from "@/lib/ai-reader";
import type { Tables } from "@/types/database.types";

type Extraction = Tables<"school_file_extractions">;

/** "Read with AI" for one uploaded file: Claude works out what's in it, the
 * reviewer sees a summary and preview, then imports it into the school. */
export function AiFileReader({ fileId, compact = false, onImported }: { fileId: string; compact?: boolean; onImported?: (r: ImportResult) => void }) {
  const [ex, setEx] = useState<Extraction | null>(null);
  const [busy, setBusy] = useState<"read" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!compact);

  const load = useCallback(async () => {
    const { data } = await createClient().from("school_file_extractions").select("*").eq("file_id", fileId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setEx(data ?? null);
  }, [fileId]);

  useEffect(() => {
    load();
  }, [load]);

  async function read() {
    setBusy("read");
    setError(null);
    const { error } = await readFileWithAi(fileId);
    await load();
    setBusy(null);
    setOpen(true);
    if (error) setError(error);
  }

  async function doImport() {
    if (!ex) return;
    setBusy("import");
    setError(null);
    const { data, error } = await importExtraction(ex.id);
    await load();
    setBusy(null);
    if (error) return setError(error);
    if (data) onImported?.(data.result);
  }

  const result = ex?.result as unknown as Extracted | null;
  const counts = ex?.counts as unknown as ExtractCounts | null;
  const imported = ex?.import_result as unknown as ImportResult | null;

  if (!ex || ex.status === "failed" || busy === "read") {
    return (
      <div className="space-y-2">
        <Button size="sm" variant="secondary" onClick={read} loading={busy === "read"} disabled={!!busy}>
          <Sparkles className="h-3.5 w-3.5 text-oasis-500" /> {busy === "read" ? "Reading with AI…" : ex?.status === "failed" ? "Try reading again" : "Read with AI"}
        </Button>
        {busy === "read" && <p className="text-xs text-slate-500">Claude is reading the file - this takes up to a minute for big files.</p>}
        {(error || ex?.error) && !busy && (
          <p className="flex items-start gap-1.5 text-xs text-rose-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error || ex?.error}
          </p>
        )}
      </div>
    );
  }

  if (ex.status === "processing") {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading…
      </p>
    );
  }

  return (
    <div className="w-full rounded-xl border border-oasis-100 bg-oasis-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <Sparkles className="h-4 w-4 text-oasis-500" /> {ex.status === "imported" ? "Imported" : "AI reading ready"}
          </p>
          <p className="mt-1 text-sm text-slate-600">{ex.summary}</p>
          {counts && (
            <p className="mt-1 text-xs font-semibold text-slate-700">
              {counts.students} students · {counts.parents} parents · {counts.staff} staff · {counts.classes} classes
            </p>
          )}
        </div>
        {ex.status === "ready" ? (
          <Button size="sm" onClick={doImport} loading={busy === "import"} disabled={!!busy || !counts || counts.students + counts.staff + counts.classes === 0}>
            Import into school
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Done
          </span>
        )}
      </div>

      {imported && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Added {imported.students} students, {imported.parents} new parents ({imported.links} parent–child links), {imported.staff} staff
          {imported.classes ? `, ${imported.classes} classes` : ""}
          {imported.streams ? `, ${imported.streams} streams` : ""}.
          {imported.skipped_students ? ` ${imported.skipped_students} students were already in OASIS.` : ""}
          {imported.skipped_staff ? ` ${imported.skipped_staff} staff were already on file.` : ""}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {result?.warnings?.length ? (
        <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
          {result.warnings.map((w, i) => (
            <li key={i}>• {w}</li>
          ))}
        </ul>
      ) : null}

      {result && (
        <>
          <button type="button" className="mt-3 text-xs font-semibold text-oasis-600 hover:underline" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide preview" : "Show what was found"}
          </button>
          {open && (
            <div className="mt-2 space-y-3">
              {result.sheets.length > 0 && (
                <p className="text-xs text-slate-500">
                  Sheets: {result.sheets.map((s) => `${s.name} → ${s.kind}${s.used ? ` (${s.used})` : ""}`).join(" · ")}
                </p>
              )}
              {result.students.length > 0 && (
                <div className="max-h-72 overflow-auto rounded-lg border border-slate-100 bg-white">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white text-left font-semibold uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-2 py-2">Class</th>
                        <th className="px-2 py-2">Parents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.students.slice(0, 100).map((s, i) => (
                        <tr key={i} className="border-t border-slate-50 align-top">
                          <td className="px-3 py-1.5">
                            <p className="font-medium text-slate-800">{s.full_name}</p>
                            <p className="text-slate-400">{[s.admission_number, s.gender, s.date_of_birth].filter(Boolean).join(" · ")}</p>
                          </td>
                          <td className="px-2 py-1.5 text-slate-600">{[s.class, s.stream].filter(Boolean).join(" ") || "—"}</td>
                          <td className="px-2 py-1.5 text-slate-600">{s.guardians.map((g) => [g.name, g.phone].filter(Boolean).join(" ")).join(" · ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.students.length > 100 && <p className="px-3 py-2 text-xs text-slate-400">…and {result.students.length - 100} more.</p>}
                </div>
              )}
              {result.staff.length > 0 && (
                <p className="text-xs text-slate-600">
                  <strong>Staff:</strong> {result.staff.slice(0, 30).map((s) => [s.full_name, s.job_title].filter(Boolean).join(" - ")).join(", ")}
                  {result.staff.length > 30 ? ` and ${result.staff.length - 30} more` : ""}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
