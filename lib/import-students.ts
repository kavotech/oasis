// Header-based import of a school's student list with parents/guardians.
// Works with a paste from Excel/Google Sheets (tab-separated) or a CSV file.
// One row per student; a parent with several children simply appears on each
// child's row and is created once, then linked to every child.

export type ImportGuardian = { name: string; phone: string | null; email: string | null; relationship: string | null };
export type ImportRow = {
  line: number;
  full_name: string;
  admission_number: string | null;
  className: string | null;
  streamName: string | null;
  gender: "male" | "female" | null;
  date_of_birth: string | null;
  guardians: ImportGuardian[];
  error: string | null;
};

type Field =
  | "full_name"
  | "first_name"
  | "last_name"
  | "admission_number"
  | "class"
  | "stream"
  | "gender"
  | "dob"
  | "g1_name"
  | "g1_phone"
  | "g1_email"
  | "g1_rel"
  | "g2_name"
  | "g2_phone"
  | "g2_email"
  | "g2_rel";

// Order matters: more specific patterns first.
const HEADER_RULES: [RegExp, Field][] = [
  [/^(admission|adm|reg(istration)?|student) ?(no|number|#|id)|^lin$|^index ?no/, "admission_number"],
  [/^(mother|parent ?2|guardian ?2|second (parent|guardian)).*(phone|tel|mobile|contact|number)/, "g2_phone"],
  [/^(mother|parent ?2|guardian ?2|second (parent|guardian)).*e-?mail/, "g2_email"],
  [/^(mother|parent ?2|guardian ?2|second (parent|guardian)).*(relation)/, "g2_rel"],
  [/^(mother|parent ?2|guardian ?2|second (parent|guardian))/, "g2_name"],
  [/^(father|parent ?1?|guardian ?1?|next of kin|nok|sponsor)?.*(phone|tel|mobile|contact|number)$/, "g1_phone"],
  [/^(father|parent|guardian|next of kin|nok|sponsor).*e-?mail|^e-?mail/, "g1_email"],
  [/^(father|parent|guardian|next of kin|nok).*relation|^relationship/, "g1_rel"],
  [/^(father|parent|guardian|next of kin|nok|sponsor)/, "g1_name"],
  [/^(first|given) ?name/, "first_name"],
  [/^(last|sur|family) ?name|^surname/, "last_name"],
  [/^((student|pupil|learner|child)('?s)? )?(full )?name$|^student$|^pupil$|^learner$/, "full_name"],
  [/^(class|grade|form|year|level)( name)?$/, "class"],
  [/^(stream|section|house ?class)$/, "stream"],
  [/^(gender|sex)$/, "gender"],
  [/^(dob|d\.o\.b\.?|date of birth|birth ?date|birthday)$/, "dob"],
];

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t").map((c) => c.trim());
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function gender(v: string): ImportRow["gender"] | "bad" {
  const g = v.trim().toLowerCase();
  if (!g) return null;
  if (["m", "male", "boy", "b"].includes(g)) return "male";
  if (["f", "female", "girl", "g"].includes(g)) return "female";
  return "bad";
}

function date(v: string): string | null | "bad" {
  const d = v.trim();
  if (!d) return null;
  let y: number, m: number, day: number;
  let r = d.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (r) [y, m, day] = [+r[1], +r[2], +r[3]];
  else if ((r = d.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [day, m, y] = [+r[1], +r[2], +r[3]];
  else if (/^\d{5}$/.test(d)) {
    // Excel serial date.
    const dt = new Date(Date.UTC(1899, 11, 30) + Number(d) * 86400000);
    return dt.toISOString().slice(0, 10);
  } else return "bad";
  const dt = new Date(y, m - 1, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== day) return "bad";
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const clean = (v: string | undefined) => (v ?? "").replace(/\s+/g, " ").trim();
export const normPhone = (p: string | null) => (p ? p.replace(/\D/g, "").slice(-9) : "");

export function parseStudentImport(text: string, existingAdmissionNumbers: Set<string> = new Set()) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [] as ImportRow[], columns: [] as string[], unknown: [] as string[] };
  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const headers = splitLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/[_*:]/g, " ").replace(/\s+/g, " ").trim());
  const map: Partial<Record<Field, number>> = {};
  const unknown: string[] = [];
  headers.forEach((h, i) => {
    const rule = HEADER_RULES.find(([re, f]) => re.test(h) && map[f] === undefined);
    if (rule) map[rule[1]] = i;
    else if (h) unknown.push(h);
  });
  const hasHeader = map.full_name !== undefined || map.first_name !== undefined;
  // No recognisable header: assume Name, Admission, Class, Gender, DOB, Parent, Parent phone.
  const fallback: Partial<Record<Field, number>> = { full_name: 0, admission_number: 1, class: 2, gender: 3, dob: 4, g1_name: 5, g1_phone: 6 };
  const cols = hasHeader ? map : fallback;
  const body = hasHeader ? lines.slice(1) : lines;

  const seenAdm = new Set<string>();
  const rows: ImportRow[] = body.map((line, idx) => {
    const c = splitLine(line, delimiter);
    const get = (f: Field) => (cols[f] !== undefined ? clean(c[cols[f]!]) : "");
    const name = get("full_name") || [get("first_name"), get("last_name")].filter(Boolean).join(" ");
    const g = gender(get("gender"));
    const d = date(get("dob"));
    const adm = get("admission_number") || null;
    const guardians: ImportGuardian[] = [];
    for (const k of ["g1", "g2"] as const) {
      const gName = get(`${k}_name`);
      const gPhone = get(`${k}_phone`) || null;
      const gEmail = get(`${k}_email`).toLowerCase() || null;
      if (gName || gPhone || gEmail)
        guardians.push({ name: gName || "Parent/Guardian", phone: gPhone, email: gEmail, relationship: get(`${k}_rel`) || (k === "g2" && cols.g2_name !== undefined && /mother/.test(headers[cols.g2_name!]) ? "Mother" : null) });
    }
    let error: string | null = null;
    if (!name) error = "Missing student name";
    else if (g === "bad") error = `Gender "${get("gender")}" - use M or F`;
    else if (d === "bad") error = `Date of birth "${get("dob")}" - use DD/MM/YYYY`;
    else if (adm && existingAdmissionNumbers.has(adm.toLowerCase())) error = `Admission no. ${adm} is already in OASIS`;
    else if (adm && seenAdm.has(adm.toLowerCase())) error = `Admission no. ${adm} appears twice`;
    if (adm) seenAdm.add(adm.toLowerCase());
    return {
      line: idx + (hasHeader ? 2 : 1),
      full_name: name,
      admission_number: adm,
      className: get("class") || null,
      streamName: get("stream") || null,
      gender: g === "bad" ? null : g,
      date_of_birth: d === "bad" ? null : d,
      guardians,
      error,
    };
  });

  const recognised = (Object.keys(cols) as Field[]).map((f) => f.replace(/^g1_/, "parent ").replace(/^g2_/, "second parent ").replace(/_/g, " "));
  return { rows, columns: hasHeader ? recognised : ["(no header - assumed Name, Admission, Class, Gender, DOB, Parent, Parent phone)"], unknown };
}

/** Stable identity for de-duplicating parents across rows. */
export function guardianKey(g: ImportGuardian) {
  const p = normPhone(g.phone);
  if (p) return `p:${p}`;
  if (g.email) return `e:${g.email}`;
  return `n:${g.name.toLowerCase()}`;
}

export const IMPORT_TEMPLATE = `Student name,Admission no,Class,Stream,Gender,Date of birth,Parent name,Parent phone,Parent email,Relationship,Mother name,Mother phone
Amina Nakato,ADM/2026/001,P3,Blue,F,14/03/2018,John Ssali,0772 123456,ssali@example.com,Father,Grace Ssali,0701 654321
Brian Ssali,ADM/2026/002,P5,Red,M,02/11/2016,John Ssali,0772 123456,ssali@example.com,Father,Grace Ssali,0701 654321
Patience Atim,ADM/2026/003,P3,Blue,F,21/07/2018,Rose Akello,0782 111222,,Mother,,`;
