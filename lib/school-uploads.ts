"use client";

import { createClient } from "@/lib/supabase/client";

export type UploadCategory = "document" | "data" | "other";

/** Uploads one file into the school's private folder in the "school-uploads"
 * bucket and indexes it in school_files so OASIS developers can find it.
 * `relativePath` keeps folder structure when a whole folder is uploaded. */
export async function uploadSchoolFile(
  schoolId: string,
  file: File,
  category: UploadCategory,
  opts: { relativePath?: string; note?: string } = {}
): Promise<{ error: string | null; id?: string }> {
  const supabase = createClient();
  const rel = (opts.relativePath || file.name).replace(/^\/+/, "");
  const safe = rel
    .split("/")
    .map((part) => part.replace(/[^\w.\- ()]+/g, "_").slice(0, 120))
    .join("/");
  const path = `${schoolId}/${category}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}/${safe}`;

  const { error: upErr } = await supabase.storage.from("school-uploads").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { error: upErr.message };

  const { data: auth } = await supabase.auth.getUser();
  const { data: row, error: rowErr } = await supabase.from("school_files").insert({
    school_id: schoolId,
    path,
    name: rel,
    size_bytes: file.size,
    content_type: file.type || null,
    category,
    note: opts.note ?? null,
    uploaded_by: auth.user?.id ?? null,
  }).select("id").single();
  return { error: rowErr?.message ?? null, id: row?.id };
}

/** A short-lived download link (developers and the school itself). */
export async function signedUrl(path: string, seconds = 300) {
  const { data } = await createClient().storage.from("school-uploads").createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
