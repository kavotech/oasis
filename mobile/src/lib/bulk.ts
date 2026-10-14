// Parsing for "bulk add students": one student per line, columns in order
// Full name, Admission number, Gender, Date of birth. Accepts comma- or
// tab-separated text (a paste from Excel/Google Sheets is tab-separated), skips
// a header row, and understands YYYY-MM-DD, DD/MM/YYYY and DD-MM-YYYY dates.

export type ParsedStudent = {
  line: number;
  full_name: string;
  admission_number: string | null;
  gender: "male" | "female" | null;
  date_of_birth: string | null;
  error: string | null;
};

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  // Minimal CSV: respects "quoted, values".
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseGender(v: string): ParsedStudent["gender"] | "invalid" {
  const g = v.trim().toLowerCase();
  if (!g) return null;
  if (["m", "male", "boy", "b"].includes(g)) return "male";
  if (["f", "female", "girl", "g"].includes(g)) return "female";
  return "invalid";
}

function parseDate(v: string): string | null | "invalid" {
  const d = v.trim();
  if (!d) return null;
  let y: number, m: number, day: number;
  let match = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) [y, m, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = d.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [day, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return "invalid";
  const date = new Date(y, m - 1, day);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== day) return "invalid";
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseStudentLines(text: string, existingAdmissionNumbers: Set<string> = new Set()): ParsedStudent[] {
  const seen = new Set<string>();
  const rows: ParsedStudent[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const [name = "", adm = "", gender = "", dob = ""] = splitLine(raw);
    if (i === 0 && /name/i.test(name) && !/\d/.test(name)) return; // header row
    const g = parseGender(gender);
    const d = parseDate(dob);
    const admission = adm.trim() || null;
    let error: string | null = null;
    if (!name.trim()) error = "Missing name";
    else if (g === "invalid") error = `Gender "${gender}" - use M or F`;
    else if (d === "invalid") error = `Date "${dob}" - use DD/MM/YYYY`;
    else if (admission && existingAdmissionNumbers.has(admission.toLowerCase())) error = `Admission no. ${admission} already exists`;
    else if (admission && seen.has(admission.toLowerCase())) error = `Admission no. ${admission} is repeated`;
    if (admission) seen.add(admission.toLowerCase());
    rows.push({
      line: i + 1,
      full_name: name.replace(/\s+/g, " ").trim(),
      admission_number: admission,
      gender: g === "invalid" ? null : g,
      date_of_birth: d === "invalid" ? null : d,
      error,
    });
  });
  return rows;
}

export const BULK_STUDENTS_EXAMPLE = `Full name, Admission no, Gender, Date of birth
Amina Nakato, ODS/2026/101, F, 14/03/2012
Brian Okello, ODS/2026/102, M, 02/11/2011
Patience Atim, ODS/2026/103, F, 2012-07-21`;

/** YYYY-MM-DD for today in local time. */
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
