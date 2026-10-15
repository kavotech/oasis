// Pure helpers for extract-school-data: no imports, so they run under Deno
// (the Edge Function) and Node (tests) alike.

export type Guardian = { name: string; phone: string | null; email: string | null; relationship: string | null };
export type Student = {
  full_name: string;
  admission_number: string | null;
  class: string | null;
  stream: string | null;
  gender: "male" | "female" | null;
  date_of_birth: string | null;
  guardians: Guardian[];
};
export type Staff = { full_name: string; email: string | null; phone: string | null; job_title: string | null; department: string | null; gender: "male" | "female" | null };
export type ClassInfo = { name: string; streams: string[] };
export type Extracted = {
  summary: string;
  source: "spreadsheet" | "document";
  sheets: { name: string; kind: string; rows: number; used: number; notes: string | null }[];
  students: Student[];
  staff: Staff[];
  classes: ClassInfo[];
  warnings: string[];
};

export type SheetPlan = {
  sheet_name: string;
  kind: "students" | "staff" | "parents" | "classes" | "other";
  header_row: number;
  columns: Record<string, number>;
  class_for_all_rows?: string | null;
  stream_for_all_rows?: string | null;
  notes?: string | null;
};

export const STUDENT_FIELDS = [
  "full_name", "first_name", "middle_name", "last_name", "admission_number", "class", "stream", "gender", "date_of_birth",
  "g1_name", "g1_phone", "g1_email", "g1_relationship", "g2_name", "g2_phone", "g2_email", "g2_relationship",
];
export const STAFF_FIELDS = ["full_name", "first_name", "last_name", "email", "phone", "job_title", "department", "gender"];
export const PARENT_FIELDS = ["admission_number", "student_name", "g_name", "g_phone", "g_email", "g_relationship"];
export const CLASS_FIELDS = ["class", "stream"];

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const nullable = (v: unknown) => clean(v) || null;
export const normPhone = (p: string | null) => (p ? p.replace(/\D/g, "").slice(-9) : "");
const titleCase = (s: string) => (s === s.toUpperCase() && /[A-Z]{2}/.test(s) ? s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : s);

export function gender(v: unknown): "male" | "female" | null {
  const g = clean(v).toLowerCase();
  if (["m", "male", "boy", "b", "man"].includes(g)) return "male";
  if (["f", "female", "girl", "g", "woman"].includes(g)) return "female";
  return null;
}

export function date(v: unknown): string | null {
  const d = clean(v);
  if (!d) return null;
  let y: number, m: number, day: number;
  let r = d.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (r) [y, m, day] = [+r[1], +r[2], +r[3]];
  else if ((r = d.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
    [day, m, y] = [+r[1], +r[2], +r[3]];
    if (y < 100) y += y > 30 ? 1900 : 2000;
    if (m > 12 && day <= 12) [day, m] = [m, day]; // US-style M/D/Y
  } else if (/^\d{5}$/.test(d)) {
    return new Date(Date.UTC(1899, 11, 30) + Number(d) * 86400000).toISOString().slice(0, 10);
  } else {
    const t = Date.parse(d);
    if (Number.isNaN(t)) return null;
    return new Date(t).toISOString().slice(0, 10);
  }
  const dt = new Date(Date.UTC(y, m - 1, day));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== day || y < 1900 || y > 2100) return null;
  return dt.toISOString().slice(0, 10);
}

const email = (v: unknown) => {
  const e = clean(v).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
};
const phone = (v: unknown) => {
  const p = clean(v);
  return p.replace(/\D/g, "").length >= 9 ? p : null;
};

export function guardianKey(g: Guardian) {
  const p = normPhone(g.phone);
  if (p) return `p:${p}`;
  if (g.email) return `e:${g.email}`;
  return `n:${g.name.toLowerCase()}`;
}

function makeGuardian(name: unknown, ph: unknown, em: unknown, rel: unknown): Guardian | null {
  const g = { name: titleCase(clean(name)), phone: phone(ph), email: email(em), relationship: nullable(rel) };
  if (!g.name && !g.phone && !g.email) return null;
  if (!g.name) g.name = "Parent/Guardian";
  return g;
}

/** Turn a sheet's rows into records using the plan Claude chose. */
export function applyPlans(sheets: { name: string; rows: string[][] }[], plans: SheetPlan[], summary: string): Extracted {
  const out: Extracted = { summary, source: "spreadsheet", sheets: [], students: [], staff: [], classes: [], warnings: [] };
  const parentRows: { adm: string | null; student: string | null; g: Guardian }[] = [];
  const classMap = new Map<string, Set<string>>();
  const addClass = (c: string | null, s: string | null) => {
    if (!c) return;
    const set = classMap.get(c) ?? new Set<string>();
    if (s) set.add(s);
    classMap.set(c, set);
  };

  for (const sheet of sheets) {
    const plan = plans.find((p) => p.sheet_name === sheet.name);
    if (!plan || plan.kind === "other") {
      out.sheets.push({ name: sheet.name, kind: plan?.kind ?? "other", rows: sheet.rows.length, used: 0, notes: plan?.notes ?? null });
      continue;
    }
    const col = (row: string[], f: string) => (plan.columns[f] !== undefined && plan.columns[f] !== null && plan.columns[f] >= 0 ? row[plan.columns[f]] : "");
    const body = sheet.rows.slice(Math.max(0, plan.header_row + 1));
    let used = 0;
    for (const row of body) {
      if (!row.some((c) => clean(c))) continue;
      if (plan.kind === "students") {
        const name = clean(col(row, "full_name")) || [col(row, "first_name"), col(row, "middle_name"), col(row, "last_name")].map(clean).filter(Boolean).join(" ");
        if (!name || /^(total|name|student)/i.test(name)) continue;
        const cls = nullable(col(row, "class")) ?? plan.class_for_all_rows ?? null;
        const stream = nullable(col(row, "stream")) ?? plan.stream_for_all_rows ?? null;
        const guardians = [
          makeGuardian(col(row, "g1_name"), col(row, "g1_phone"), col(row, "g1_email"), col(row, "g1_relationship")),
          makeGuardian(col(row, "g2_name"), col(row, "g2_phone"), col(row, "g2_email"), col(row, "g2_relationship")),
        ].filter(Boolean) as Guardian[];
        out.students.push({ full_name: titleCase(name), admission_number: nullable(col(row, "admission_number")), class: cls, stream, gender: gender(col(row, "gender")), date_of_birth: date(col(row, "date_of_birth")), guardians });
        addClass(cls, stream);
        used++;
      } else if (plan.kind === "staff") {
        const name = clean(col(row, "full_name")) || [col(row, "first_name"), col(row, "last_name")].map(clean).filter(Boolean).join(" ");
        if (!name || /^(total|name)$/i.test(name)) continue;
        out.staff.push({ full_name: titleCase(name), email: email(col(row, "email")), phone: phone(col(row, "phone")), job_title: nullable(col(row, "job_title")), department: nullable(col(row, "department")), gender: gender(col(row, "gender")) });
        used++;
      } else if (plan.kind === "parents") {
        const g = makeGuardian(col(row, "g_name"), col(row, "g_phone"), col(row, "g_email"), col(row, "g_relationship"));
        if (!g) continue;
        parentRows.push({ adm: nullable(col(row, "admission_number")), student: nullable(col(row, "student_name")), g });
        used++;
      } else if (plan.kind === "classes") {
        const c = nullable(col(row, "class"));
        if (!c) continue;
        addClass(c, nullable(col(row, "stream")));
        used++;
      }
    }
    out.sheets.push({ name: sheet.name, kind: plan.kind, rows: body.length, used, notes: plan.notes ?? null });
  }

  // A separate parents sheet: attach to the children by admission number or name.
  if (parentRows.length) {
    const byAdm = new Map(out.students.filter((s) => s.admission_number).map((s) => [s.admission_number!.toLowerCase(), s]));
    const byName = new Map(out.students.map((s) => [s.full_name.toLowerCase(), s]));
    let unmatched = 0;
    for (const pr of parentRows) {
      const st = (pr.adm && byAdm.get(pr.adm.toLowerCase())) || (pr.student && byName.get(pr.student.toLowerCase()));
      if (st) {
        if (!st.guardians.some((g) => guardianKey(g) === guardianKey(pr.g))) st.guardians.push(pr.g);
      } else unmatched++;
    }
    if (unmatched) out.warnings.push(`${unmatched} parent row${unmatched === 1 ? "" : "s"} didn't match any student in this file and will be skipped.`);
  }

  out.classes = [...classMap.entries()].map(([name, s]) => ({ name, streams: [...s] }));
  return finish(out);
}

/** Tidy records Claude listed straight from a PDF or photo. */
export function fromDocument(raw: {
  summary?: string;
  students?: { full_name?: string; admission_number?: string; class?: string; stream?: string; gender?: string; date_of_birth?: string; guardians?: { name?: string; phone?: string; email?: string; relationship?: string }[] }[];
  staff?: { full_name?: string; email?: string; phone?: string; job_title?: string; department?: string; gender?: string }[];
  classes?: { name?: string; streams?: string[] }[];
  notes?: string;
}): Extracted {
  const out: Extracted = { summary: clean(raw.summary) || "Read from the document.", source: "document", sheets: [], students: [], staff: [], classes: [], warnings: [] };
  for (const s of raw.students ?? []) {
    const name = clean(s.full_name);
    if (!name) continue;
    out.students.push({
      full_name: titleCase(name),
      admission_number: nullable(s.admission_number),
      class: nullable(s.class),
      stream: nullable(s.stream),
      gender: gender(s.gender),
      date_of_birth: date(s.date_of_birth),
      guardians: (s.guardians ?? []).map((g) => makeGuardian(g.name, g.phone, g.email, g.relationship)).filter(Boolean) as Guardian[],
    });
  }
  for (const s of raw.staff ?? []) {
    const name = clean(s.full_name);
    if (name) out.staff.push({ full_name: titleCase(name), email: email(s.email), phone: phone(s.phone), job_title: nullable(s.job_title), department: nullable(s.department), gender: gender(s.gender) });
  }
  const classMap = new Map<string, Set<string>>();
  for (const c of raw.classes ?? []) if (clean(c.name)) classMap.set(clean(c.name), new Set((c.streams ?? []).map(clean).filter(Boolean)));
  for (const s of out.students) if (s.class) (classMap.get(s.class) ?? classMap.set(s.class, new Set()).get(s.class)!).add(s.stream ?? "");
  out.classes = [...classMap.entries()].map(([name, set]) => ({ name, streams: [...set].filter(Boolean) }));
  if (raw.notes) out.warnings.push(clean(raw.notes));
  return finish(out);
}

function finish(out: Extracted): Extracted {
  // Same admission number twice in the file: keep the first.
  const seen = new Set<string>();
  const before = out.students.length;
  out.students = out.students.filter((s) => {
    if (!s.admission_number) return true;
    const k = s.admission_number.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (out.students.length < before) out.warnings.push(`${before - out.students.length} duplicate admission number${before - out.students.length === 1 ? "" : "s"} removed.`);
  const noClass = out.students.filter((s) => !s.class).length;
  if (noClass) out.warnings.push(`${noClass} student${noClass === 1 ? " has" : "s have"} no class - they'll be added without one.`);
  return out;
}

export function counts(x: Extracted) {
  return {
    students: x.students.length,
    parents: new Set(x.students.flatMap((s) => s.guardians.map(guardianKey))).size,
    staff: x.staff.length,
    classes: x.classes.length,
  };
}
