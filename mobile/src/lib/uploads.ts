import type { DocumentPickerAsset } from "expo-document-picker";
import { supabase } from "./supabase";

export type UploadCategory = "document" | "data" | "other";

/** Same layout as the website (lib/school-uploads.ts): the file goes into the
 * school's private folder in "school-uploads" and is indexed in school_files
 * so OASIS developers can review and import it. */
export async function uploadSchoolAsset(schoolId: string, asset: DocumentPickerAsset, category: UploadCategory, note?: string): Promise<{ error: string | null; id?: string }> {
  const safe = asset.name.replace(/[^\w.\- ()]+/g, "_").slice(0, 120);
  const path = `${schoolId}/${category}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}/${safe}`;
  try {
    const body = asset.file ?? (await (await fetch(asset.uri)).arrayBuffer());
    const { error: upErr } = await supabase.storage.from("school-uploads").upload(path, body, { contentType: asset.mimeType || "application/octet-stream" });
    if (upErr) return { error: upErr.message };
  } catch (e) {
    return { error: (e as Error).message };
  }
  const { data: auth } = await supabase.auth.getUser();
  const { data: row, error } = await supabase.from("school_files").insert({
    school_id: schoolId,
    path,
    name: asset.name,
    size_bytes: asset.size ?? null,
    content_type: asset.mimeType ?? null,
    category,
    note: note ?? null,
    uploaded_by: auth.user?.id ?? null,
  }).select("id").single();
  return { error: error?.message ?? null, id: row?.id };
}

export async function signedUrl(path: string, seconds = 600) {
  const { data } = await supabase.storage.from("school-uploads").createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
