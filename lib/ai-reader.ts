"use client";

import { createClient } from "@/lib/supabase/client";

export type ExtractedStudent = {
  full_name: string;
  admission_number: string | null;
  class: string | null;
  stream: string | null;
  gender: string | null;
  date_of_birth: string | null;
  guardians: { name: string; phone: string | null; email: string | null; relationship: string | null }[];
};
export type Extracted = {
  summary: string;
  source: "spreadsheet" | "document";
  sheets: { name: string; kind: string; rows: number; used: number; notes: string | null }[];
  students: ExtractedStudent[];
  staff: { full_name: string; email: string | null; phone: string | null; job_title: string | null; department: string | null }[];
  classes: { name: string; streams: string[] }[];
  warnings: string[];
};
export type ExtractCounts = { students: number; parents: number; staff: number; classes: number };
export type ImportResult = { students: number; skipped_students: number; parents: number; links: number; staff: number; skipped_staff: number; classes: number; streams: number };

async function call<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await createClient().functions.invoke("extract-school-data", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    try {
      const j = ctx ? await ctx.clone().json() : null;
      return { data: null, error: j?.error ?? error.message };
    } catch {
      return { data: null, error: error.message };
    }
  }
  return { data: data as T, error: null };
}

/** Ask Claude to read an uploaded school file (Excel, CSV, PDF or photo). */
export const readFileWithAi = (fileId: string) => call<{ extraction: { id: string } }>({ file_id: fileId });

/** Import a reviewed reading into the school. */
export const importExtraction = (extractionId: string) => call<{ result: ImportResult }>({ action: "import", extraction_id: extractionId });

export const AI_FILE_ACCEPT = ".xlsx,.xls,.xlsm,.ods,.csv,.tsv,.txt,.pdf,.png,.jpg,.jpeg,.webp";
