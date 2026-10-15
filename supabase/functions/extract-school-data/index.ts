// Reads a file a school uploaded (Excel, CSV, PDF or photo) with Claude and
// turns it into students, parents, staff and classes; a second call imports
// the reviewed result into the school.
//
//   POST { file_id }                          -> extract (returns the extraction)
//   POST { action: "import", extraction_id }  -> import into the school
//
// Callers: OASIS developers (any school) or the school's own administrators.
// Needs the ANTHROPIC_API_KEY secret. CLAUDE_MODEL overrides the model.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";
import {
  applyPlans,
  CLASS_FIELDS,
  counts,
  fromDocument,
  guardianKey,
  normPhone,
  PARENT_FIELDS,
  STAFF_FIELDS,
  STUDENT_FIELDS,
  type Extracted,
  type SheetPlan,
} from "./normalize.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-opus-5-5";
const MAX_BYTES = 25 * 1024 * 1024;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Who is calling?
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(jwt);
  if (!auth?.user) return json({ error: "Please sign in again." }, 401);
  const { data: me } = await admin.from("profiles").select("id, role, school_id").eq("id", auth.user.id).maybeSingle();
  const canUse = (schoolId: string) => me?.role === "super_admin" || (me?.role === "school_admin" && me.school_id === schoolId);

  let body: { file_id?: string; action?: string; extraction_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  try {
    if (body.action === "import") {
      const { data: ex } = await admin.from("school_file_extractions").select("*").eq("id", body.extraction_id ?? "").maybeSingle();
      if (!ex) return json({ error: "That reading no longer exists." }, 404);
      if (!canUse(ex.school_id)) return json({ error: "You can't import into this school." }, 403);
      if (ex.status === "imported") return json({ error: "This file has already been imported." }, 409);
      if (ex.status !== "ready") return json({ error: "This file hasn't been read successfully yet." }, 409);
      const result = await importInto(ex.school_id, ex.result as Extracted);
      await admin.from("school_file_extractions").update({ status: "imported", import_result: result, imported_by: auth.user.id, imported_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", ex.id);
      await admin.from("school_files").update({ status: "imported" }).eq("id", ex.file_id);
      return json({ ok: true, result });
    }

    // Extract.
    const { data: file } = await admin.from("school_files").select("*").eq("id", body.file_id ?? "").maybeSingle();
    if (!file) return json({ error: "File not found." }, 404);
    if (!canUse(file.school_id)) return json({ error: "You can't read this school's files." }, 403);
    if (!ANTHROPIC_API_KEY) return json({ error: "The AI reader isn't switched on yet - add the ANTHROPIC_API_KEY secret in Supabase." }, 503);

    const { data: row } = await admin
      .from("school_file_extractions")
      .insert({ school_id: file.school_id, file_id: file.id, status: "processing", model: MODEL, requested_by: auth.user.id })
      .select("id")
      .single();
    const extractionId = row!.id as string;

    try {
      const { data: blob, error: dlErr } = await admin.storage.from("school-uploads").download(file.path);
      if (dlErr || !blob) throw new Error("Couldn't open the file from storage.");
      if (blob.size > MAX_BYTES) throw new Error("This file is over 25 MB - split it into smaller files.");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const kind = fileKind(file.name, file.content_type);
      const extracted = kind === "sheet" ? await readSpreadsheet(bytes, file.name) : await readDocument(bytes, kind, file.name);
      const c = counts(extracted);
      await admin.from("school_file_extractions").update({ status: "ready", summary: extracted.summary, result: extracted, counts: c, updated_at: new Date().toISOString() }).eq("id", extractionId);
      return json({ extraction: { id: extractionId, status: "ready", summary: extracted.summary, counts: c, result: extracted } });
    } catch (e) {
      const message = (e as Error).message || "Couldn't read this file.";
      await admin.from("school_file_extractions").update({ status: "failed", error: message, updated_at: new Date().toISOString() }).eq("id", extractionId);
      return json({ error: message, extraction_id: extractionId }, 422);
    }
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || "Something went wrong." }, 500);
  }
});

type Kind = "sheet" | "pdf" | "image";
function fileKind(name: string, type: string | null): Kind {
  const n = name.toLowerCase();
  if (/\.(xlsx|xlsm|xls|csv|tsv|txt|ods)$/.test(n) || /spreadsheet|excel|csv/.test(type ?? "")) return "sheet";
  if (n.endsWith(".pdf") || type === "application/pdf") return "pdf";
  if (/\.(png|jpe?g|webp|gif|heic)$/.test(n) || (type ?? "").startsWith("image/")) return "image";
  if (/\.(docx?|pptx?)$/.test(n)) throw new Error("Word and PowerPoint files can't be read yet - save it as PDF or Excel and upload that.");
  throw new Error("This type of file can't be read - upload Excel, CSV, PDF or a photo.");
}

// ---- Claude ---------------------------------------------------------------

async function claude(content: unknown[], tool: { name: string; description: string; input_schema: unknown }, maxTokens: number) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system:
        "You help OASIS, a school management system in Uganda, load a school's records from files the school uploaded. Ugandan schools use classes like Baby/Middle/Top class, P1-P7, S1-S6 and streams like Blue, East or A. Phone numbers look like 0772 123456 or +256 772 123456. Be accurate: never invent people or values - leave a field empty if it isn't in the file.",
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Claude API error", res.status, text);
    if (res.status === 401) throw new Error("The ANTHROPIC_API_KEY secret is invalid.");
    if (res.status === 429 || res.status === 529) throw new Error("The AI reader is busy - try again in a minute.");
    throw new Error("The AI reader couldn't process this file.");
  }
  const data = await res.json();
  const use = (data.content ?? []).find((b: { type: string }) => b.type === "tool_use");
  if (!use) throw new Error("The AI reader didn't return any records.");
  if (data.stop_reason === "max_tokens") throw new Error("This document is too long to read in one go - split it into smaller files (e.g. one class per file).");
  return use.input;
}

async function readSpreadsheet(bytes: Uint8Array, fileName: string): Promise<Extracted> {
  const wb = /\.(csv|tsv|txt)$/i.test(fileName) ? XLSX.read(new TextDecoder().decode(bytes), { type: "string", raw: false }) : XLSX.read(bytes, { type: "array", cellDates: true });
  const sheets = wb.SheetNames.slice(0, 30)
    .map((name: string) => ({
      name,
      rows: (XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: "", dateNF: "yyyy-mm-dd" }) as unknown[][]).map((r) => r.map((c) => String(c ?? "").trim())),
    }))
    .filter((s: { rows: string[][] }) => s.rows.some((r) => r.some((c) => c)));
  if (!sheets.length) throw new Error("The spreadsheet is empty.");

  const preview = sheets
    .map((s: { name: string; rows: string[][] }) => {
      const sample = s.rows.slice(0, 25).map((r, i) => `${i}: ${r.map((c) => c.slice(0, 50)).join(" | ")}`).join("\n");
      return `### Sheet "${s.name}" (${s.rows.length} rows)\n${sample}`;
    })
    .join("\n\n");

  const out = await claude(
    [
      {
        type: "text",
        text: `File: ${fileName}\nHere are the first rows of every sheet (row index: cells separated by |). Decide what each sheet holds and which column (0-based) holds each field. If one sheet per class has no class column, put the class (and stream) from the sheet name or title rows in class_for_all_rows / stream_for_all_rows.\n\n${preview}`,
      },
    ],
    {
      name: "describe_sheets",
      description: "Describe each sheet and map its columns to OASIS fields.",
      input_schema: {
        type: "object",
        required: ["summary", "sheets"],
        properties: {
          summary: { type: "string", description: "One or two plain sentences for the school: what this file contains and what will be imported." },
          sheets: {
            type: "array",
            items: {
              type: "object",
              required: ["sheet_name", "kind", "header_row", "columns"],
              properties: {
                sheet_name: { type: "string" },
                kind: { type: "string", enum: ["students", "staff", "parents", "classes", "other"], description: "students = one row per learner (may include parent columns); parents = a separate parent list linked by admission number or student name; other = fees, marks, notes etc. (skipped)" },
                header_row: { type: "integer", description: "0-based index of the heading row, or -1 if there is none" },
                columns: {
                  type: "object",
                  description: `Field -> 0-based column index. Students: ${STUDENT_FIELDS.join(", ")} (g1 = first parent/guardian, g2 = second, e.g. mother). Staff: ${STAFF_FIELDS.join(", ")}. Parents: ${PARENT_FIELDS.join(", ")}. Classes: ${CLASS_FIELDS.join(", ")}. Only include fields that exist.`,
                  additionalProperties: { type: "integer" },
                },
                class_for_all_rows: { type: ["string", "null"] },
                stream_for_all_rows: { type: ["string", "null"] },
                notes: { type: ["string", "null"], description: "Anything the reviewer should know about this sheet" },
              },
            },
          },
        },
      },
    },
    4000,
  );
  return applyPlans(sheets, (out.sheets ?? []) as SheetPlan[], String(out.summary ?? ""));
}

function b64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function readDocument(bytes: Uint8Array, kind: Kind, fileName: string): Promise<Extracted> {
  const lower = fileName.toLowerCase();
  const media = kind === "pdf" ? "application/pdf" : lower.endsWith(".png") ? "image/png" : lower.endsWith(".webp") ? "image/webp" : lower.endsWith(".gif") ? "image/gif" : "image/jpeg";
  const block = kind === "pdf" ? { type: "document", source: { type: "base64", media_type: media, data: b64(bytes) } } : { type: "image", source: { type: "base64", media_type: media, data: b64(bytes) } };
  const person = { type: "string" };
  const out = await claude(
    [
      block,
      { type: "text", text: `File: ${fileName}\nList every student (with their parents/guardians), staff member and class in this document. Skip anything that isn't a person or class (fees, marks, letters).` },
    ],
    {
      name: "record_school_data",
      description: "Record the people and classes found in the document.",
      input_schema: {
        type: "object",
        required: ["summary", "students", "staff", "classes"],
        properties: {
          summary: { type: "string", description: "One or two plain sentences: what this document contains." },
          students: {
            type: "array",
            items: {
              type: "object",
              required: ["full_name"],
              properties: {
                full_name: person,
                admission_number: { type: "string" },
                class: { type: "string" },
                stream: { type: "string" },
                gender: { type: "string", enum: ["male", "female", ""] },
                date_of_birth: { type: "string", description: "YYYY-MM-DD" },
                guardians: { type: "array", items: { type: "object", properties: { name: person, phone: { type: "string" }, email: { type: "string" }, relationship: { type: "string" } } } },
              },
            },
          },
          staff: { type: "array", items: { type: "object", required: ["full_name"], properties: { full_name: person, email: { type: "string" }, phone: { type: "string" }, job_title: { type: "string" }, department: { type: "string" }, gender: { type: "string" } } } },
          classes: { type: "array", items: { type: "object", properties: { name: { type: "string" }, streams: { type: "array", items: { type: "string" } } } } },
          notes: { type: "string", description: "Anything unclear or unreadable the reviewer should check" },
        },
      },
    },
    32000,
  );
  return fromDocument(out);
}

// ---- Import ----------------------------------------------------------------

async function importInto(schoolId: string, x: Extracted) {
  const r = { students: 0, skipped_students: 0, parents: 0, links: 0, staff: 0, skipped_staff: 0, classes: 0, streams: 0 };
  const key = (s: string) => s.trim().toLowerCase();

  // Classes and streams.
  const { data: classRows } = await admin.from("classes").select("id, name").eq("school_id", schoolId);
  const classBy = new Map((classRows ?? []).map((c) => [key(c.name), c as { id: string; name: string }]));
  const wanted = new Map<string, string>();
  for (const c of x.classes) wanted.set(key(c.name), c.name);
  for (const s of x.students) if (s.class) wanted.set(key(s.class), s.class);
  const newClasses = [...wanted.entries()].filter(([k]) => !classBy.has(k)).map(([, name]) => ({ school_id: schoolId, name }));
  if (newClasses.length) {
    const { data, error } = await admin.from("classes").insert(newClasses).select("id, name");
    if (error) throw new Error(`Couldn't create classes: ${error.message}`);
    for (const c of data ?? []) classBy.set(key(c.name), c);
    r.classes = data?.length ?? 0;
  }
  const { data: streamRows } = await admin.from("streams").select("id, name, class_id").eq("school_id", schoolId);
  const sk = (classId: string, n: string) => `${classId}|${key(n)}`;
  const streamBy = new Map((streamRows ?? []).map((s) => [sk(s.class_id, s.name), s.id as string]));
  const newStreams = new Map<string, { school_id: string; class_id: string; name: string }>();
  const wantStream = (cls: string | null, stream: string | null) => {
    const c = cls ? classBy.get(key(cls)) : null;
    if (c && stream && !streamBy.has(sk(c.id, stream))) newStreams.set(sk(c.id, stream), { school_id: schoolId, class_id: c.id, name: stream });
  };
  for (const c of x.classes) for (const s of c.streams) wantStream(c.name, s);
  for (const s of x.students) wantStream(s.class, s.stream);
  if (newStreams.size) {
    const { data, error } = await admin.from("streams").insert([...newStreams.values()]).select("id, name, class_id");
    if (error) throw new Error(`Couldn't create streams: ${error.message}`);
    for (const s of data ?? []) streamBy.set(sk(s.class_id, s.name), s.id);
    r.streams = data?.length ?? 0;
  }

  // Students already in OASIS (by admission number) are skipped.
  const { data: existingStudents } = await admin.from("students").select("admission_number").eq("school_id", schoolId);
  const existingAdm = new Set((existingStudents ?? []).map((s) => s.admission_number?.toLowerCase()).filter(Boolean));
  const students = x.students.filter((s) => {
    const dup = s.admission_number && existingAdm.has(s.admission_number.toLowerCase());
    if (dup) r.skipped_students++;
    return !dup;
  });

  // Parents: reuse by phone/email, create the rest once.
  const { data: existingGuardians } = await admin.from("guardians").select("id, full_name, phone, email").eq("school_id", schoolId);
  const gBy = new Map<string, string>();
  for (const g of existingGuardians ?? []) {
    if (g.phone) gBy.set(`p:${normPhone(g.phone)}`, g.id);
    if (g.email) gBy.set(`e:${g.email.toLowerCase()}`, g.id);
  }
  const toCreate = new Map<string, Extracted["students"][number]["guardians"][number]>();
  for (const s of students) for (const g of s.guardians) if (!gBy.has(guardianKey(g))) toCreate.set(guardianKey(g), g);
  const newG = [...toCreate.entries()];
  for (let i = 0; i < newG.length; i += 200) {
    const chunk = newG.slice(i, i + 200);
    const { data, error } = await admin
      .from("guardians")
      .insert(chunk.map(([, g]) => ({ school_id: schoolId, full_name: g.name, phone: g.phone, email: g.email, relationship: g.relationship, is_emergency_contact: true })))
      .select("id");
    if (error) throw new Error(`Couldn't add parents: ${error.message}`);
    (data ?? []).forEach((row, j) => gBy.set(chunk[j][0], row.id));
    r.parents += data?.length ?? 0;
  }

  const links: { school_id: string; student_id: string; guardian_id: string }[] = [];
  for (let i = 0; i < students.length; i += 200) {
    const chunk = students.slice(i, i + 200);
    const { data, error } = await admin
      .from("students")
      .insert(
        chunk.map((s) => {
          const c = s.class ? classBy.get(key(s.class)) : null;
          const g = s.guardians[0];
          return {
            school_id: schoolId,
            full_name: s.full_name,
            admission_number: s.admission_number,
            gender: s.gender,
            date_of_birth: s.date_of_birth,
            class_id: c?.id ?? null,
            form_class: c?.name ?? s.class,
            stream_id: c && s.stream ? (streamBy.get(sk(c.id, s.stream)) ?? null) : null,
            guardian_name: g?.name ?? null,
            guardian_phone: g?.phone ?? null,
            guardian_email: g?.email ?? null,
            status: "active",
          };
        }),
      )
      .select("id");
    if (error) throw new Error(`Couldn't add students (after ${r.students} were added): ${error.message}`);
    (data ?? []).forEach((row, j) => {
      for (const g of chunk[j].guardians) {
        const gid = gBy.get(guardianKey(g));
        if (gid) links.push({ school_id: schoolId, student_id: row.id, guardian_id: gid });
      }
    });
    r.students += data?.length ?? 0;
  }
  const uniq = [...new Map(links.map((l) => [`${l.student_id}|${l.guardian_id}`, l])).values()];
  for (let i = 0; i < uniq.length; i += 500) {
    const { error } = await admin.from("student_guardians").insert(uniq.slice(i, i + 500));
    if (error) throw new Error(`Couldn't link parents to children: ${error.message}`);
  }
  r.links = uniq.length;

  // Staff: skip anyone already on file (same email, or same name if no email).
  if (x.staff.length) {
    const { data: existingStaff } = await admin.from("staff").select("full_name, email").eq("school_id", schoolId);
    const emails = new Set((existingStaff ?? []).map((s) => s.email?.toLowerCase()).filter(Boolean));
    const names = new Set((existingStaff ?? []).map((s) => key(s.full_name ?? "")));
    const fresh = x.staff.filter((s) => {
      const dup = s.email ? emails.has(s.email) : names.has(key(s.full_name));
      if (dup) r.skipped_staff++;
      return !dup;
    });
    for (let i = 0; i < fresh.length; i += 200) {
      const { data, error } = await admin
        .from("staff")
        .insert(fresh.slice(i, i + 200).map((s) => ({ school_id: schoolId, full_name: s.full_name, email: s.email, phone: s.phone, job_title: s.job_title, department: s.department, gender: s.gender, status: "active" })))
        .select("id");
      if (error) throw new Error(`Couldn't add staff: ${error.message}`);
      r.staff += data?.length ?? 0;
    }
  }
  return r;
}
