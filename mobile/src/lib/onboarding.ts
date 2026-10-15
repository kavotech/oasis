// The website's "Create School Account" wizard (lib/onboarding-types.ts),
// described as data so the app can render the same questions and save the
// same OnboardingData shape into school_applications.data.

export type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  kind?: "text" | "email" | "phone" | "number" | "url" | "long" | "select" | "multi";
  options?: { value: string; label: string }[];
  hint?: string;
};
export type SectionDef = { key: string; title: string; description: string; fields: FieldDef[] };

const opts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));

export const SCHOOL_TYPES = opts({
  nursery: "Nursery",
  primary: "Primary",
  secondary: "Secondary",
  nursery_primary: "Nursery & Primary",
  primary_secondary: "Primary & Secondary",
  nursery_primary_secondary: "Nursery, Primary & Secondary",
  international: "International School",
  vocational: "Vocational Institution",
  faith_based: "Faith-Based School",
  special_needs: "Special Needs School",
});

export const STUDENT_BANDS = opts({ "50_250": "50 – 250", "250_500": "250 – 500", "500_1000": "500 – 1,000", "1000_2500": "1,000 – 2,500", "2500_plus": "2,500+" });

export const MODULES = opts({
  admissions: "Admissions",
  student_management: "Student Management",
  attendance: "Attendance",
  finance: "Finance",
  school_fees: "School Fees",
  parent_portal: "Parent Portal",
  teacher_portal: "Teacher Portal",
  student_portal: "Student Portal",
  library: "Library",
  transport: "Transport",
  hostel: "Hostel",
  inventory: "Inventory",
  medical: "Medical",
  payroll: "Payroll",
  hr: "HR",
  sms: "SMS",
  email: "Email",
  timetable: "Timetable",
  exams: "Exams",
  continuous_assessment: "Continuous Assessment",
  discipline: "Discipline",
  analytics: "Analytics",
  reports: "Reports",
});

export const SECTIONS: SectionDef[] = [
  {
    key: "organisation",
    title: "School & owners",
    description: "Who runs the school and how we reach you.",
    fields: [
      { key: "schoolName", label: "School name", required: true },
      { key: "companyName", label: "Registered company / foundation", required: true },
      { key: "tradingName", label: "Trading name" },
      { key: "schoolEmail", label: "School email", required: true, kind: "email" },
      { key: "schoolPhone", label: "School phone", required: true, kind: "phone" },
      { key: "altPhone", label: "Alternative phone", kind: "phone" },
      { key: "headTeacherName", label: "Head teacher / principal", required: true },
      { key: "directorName", label: "Director / proprietor", required: true },
      { key: "website", label: "Website", kind: "url" },
    ],
  },
  {
    key: "schoolType",
    title: "Type of school",
    description: "Pick the option that best describes the school.",
    fields: [{ key: "schoolType", label: "School type", required: true, kind: "select", options: SCHOOL_TYPES }],
  },
  {
    key: "location",
    title: "Location",
    description: "Where the main campus is.",
    fields: [
      { key: "country", label: "Country", required: true },
      { key: "region", label: "Region", required: true, kind: "select", options: opts({ Central: "Central", Eastern: "Eastern", Northern: "Northern", Western: "Western" }) },
      { key: "district", label: "District", required: true },
      { key: "cityTown", label: "City / town", required: true },
      { key: "parish", label: "Parish / village" },
      { key: "physicalAddress", label: "Physical address", required: true, kind: "long" },
      { key: "mapsLink", label: "Google Maps link", kind: "url" },
      { key: "postalAddress", label: "P.O. Box" },
    ],
  },
  {
    key: "profile",
    title: "School profile",
    description: "A little history and how the school runs.",
    fields: [
      { key: "yearEstablished", label: "Year established", required: true, kind: "number" },
      { key: "yearsInOperation", label: "Years in operation", kind: "number" },
      { key: "academicCalendar", label: "Academic calendar", required: true, kind: "select", options: opts({ "3_terms": "3 terms (Uganda)", "2_semesters": "2 semesters", international: "International calendar" }) },
      { key: "ownership", label: "Ownership", required: true, kind: "select", options: opts({ government: "Government", private: "Private" }) },
      { key: "boarding", label: "Day or boarding", required: true, kind: "select", options: opts({ day: "Day", boarding: "Boarding", both: "Day & boarding" }) },
      { key: "gender", label: "Students", required: true, kind: "select", options: opts({ mixed: "Mixed", boys: "Boys only", girls: "Girls only" }) },
      { key: "numCampuses", label: "Number of campuses", kind: "number" },
      { key: "annualIntake", label: "New students per year", kind: "number" },
    ],
  },
  {
    key: "studentNumbers",
    title: "Students",
    description: "Roughly how many learners you have today.",
    fields: [
      { key: "currentPopulation", label: "Current students", required: true, kind: "select", options: STUDENT_BANDS },
      { key: "expectedGrowth", label: "Expected growth (next 2 years)", hint: "e.g. 10% or 100 more students" },
    ],
  },
  {
    key: "staff",
    title: "Staff",
    description: "Headcount by team - an estimate is fine.",
    fields: [
      { key: "teachers", label: "Teachers", required: true, kind: "number" },
      { key: "adminStaff", label: "Administration", kind: "number" },
      { key: "financeStaff", label: "Finance / bursary", kind: "number" },
      { key: "ictStaff", label: "ICT / data", kind: "number" },
      { key: "boardingStaff", label: "Boarding", kind: "number" },
      { key: "supportStaff", label: "Support staff", kind: "number" },
      { key: "totalEmployees", label: "Total employees", required: true, kind: "number" },
    ],
  },
  {
    key: "academic",
    title: "Academics",
    description: "Curriculum, classes and exams.",
    fields: [
      { key: "curriculum", label: "Curriculum", required: true, kind: "select", options: opts({ uneb: "Ugandan (UNEB / NCDC)", cambridge: "Cambridge", ib: "International Baccalaureate", american: "American", other: "Other" }) },
      { key: "otherCurriculum", label: "Other curriculum (if any)" },
      { key: "subjectsOffered", label: "Subjects offered", kind: "long" },
      { key: "numClasses", label: "Number of classes", required: true, kind: "number", hint: "e.g. P1–P7 is 7" },
      { key: "numStreams", label: "Streams per class", kind: "number" },
      { key: "examinationLevels", label: "Examination levels", hint: "e.g. PLE, UCE, UACE" },
    ],
  },
  {
    key: "currentSystems",
    title: "Current systems",
    description: "How you keep records today - this helps us move your data.",
    fields: [
      { key: "currentSystem", label: "Records are kept in", required: true, kind: "select", options: opts({ paper: "Paper records", excel: "Excel", existing_software: "Existing school software", custom_system: "Custom system" }) },
      { key: "currentSoftwareName", label: "Software name (if any)" },
    ],
  },
  {
    key: "modules",
    title: "Modules",
    description: "What you'd like to use in OASIS.",
    fields: [{ key: "modules", label: "Modules", required: true, kind: "multi", options: MODULES }],
  },
];

export type OnboardingData = Record<string, Record<string, string | string[]>>;

export function emptyOnboarding(): OnboardingData {
  const d: OnboardingData = {};
  for (const s of SECTIONS) {
    d[s.key] = {};
    for (const f of s.fields) d[s.key][f.key] = f.kind === "multi" ? [] : "";
  }
  d.location.country = "Uganda";
  return d;
}

export function sectionErrors(section: SectionDef, data: OnboardingData): string[] {
  const v = data[section.key] ?? {};
  const out: string[] = [];
  for (const f of section.fields) {
    const val = v[f.key];
    const empty = Array.isArray(val) ? val.length === 0 : !String(val ?? "").trim();
    if (f.required && empty) out.push(`${f.label} is required`);
    else if (!empty && f.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) out.push(`${f.label} doesn't look like an email`);
  }
  return out;
}

export const DOCUMENTS = [
  { key: "ursb_certificate", label: "URSB Certificate of Registration", required: true },
  { key: "operating_licence", label: "School Operating Licence", required: true },
  { key: "moe_registration", label: "Ministry of Education Registration", required: false },
  { key: "tin", label: "Tax Identification Number (TIN)", required: true },
  { key: "nssf", label: "NSSF Registration", required: false },
  { key: "trading_licence", label: "Trading Licence", required: false },
  { key: "memorandum_articles", label: "Memorandum & Articles of Association", required: false },
  { key: "director_id", label: "Company Director ID", required: true },
  { key: "head_teacher_id", label: "Head Teacher ID", required: true },
  { key: "proof_of_address", label: "Proof of School Address", required: true },
  { key: "school_logo", label: "School Logo", required: false },
  { key: "school_stamp", label: "School Stamp", required: false },
];

export const STATUS_LABEL: Record<string, string> = {
  pending_review: "Pending review",
  more_info_requested: "More info requested",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};
export const STATUS_TONE: Record<string, "warning" | "info" | "success" | "danger" | "neutral"> = {
  pending_review: "warning",
  more_info_requested: "info",
  approved: "success",
  rejected: "danger",
  suspended: "neutral",
};
