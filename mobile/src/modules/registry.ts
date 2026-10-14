// Every module mirrors its page under app/dashboard/* on the website: same
// table, same fields, same role rules. Both clients write the same rows.
import { supabase } from "@/lib/supabase";
import type { Tone } from "@/theme";
import type { FieldDef, ModuleDef, Row, SectionDef } from "./types";

const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
const num = (v: unknown) => (v === null || v === undefined ? "—" : Number(v).toLocaleString());
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ") || null;
const tone = (map: Record<string, Tone>) => (r: Row) => {
  const status = str(r.status);
  return status ? { label: status.replace(/_/g, " "), tone: map[status] ?? "neutral" } : null;
};

const STAFF_EDIT = ["school_admin", "teacher", "bursar"];
const ADMIN = ["school_admin"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const student: FieldDef = { key: "student_id", label: "Student", type: "relation", relationTable: "students", labelKey: "full_name", required: true };

// ---------------------------------------------------------------- Setup

const setupSections: SectionDef[] = [
  {
    table: "classes",
    title: "Classes",
    writeRoles: ADMIN,
    fields: [
      { key: "name", label: "Class name", type: "text", required: true, placeholder: "e.g. P1, S2" },
      { key: "education_level", label: "Education level", type: "text", placeholder: "Nursery, Primary, Secondary..." },
      { key: "academic_year", label: "Academic year", type: "text", placeholder: "2026" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "class_teacher_id", label: "Class teacher", type: "relation", relationTable: "staff", labelKey: "full_name" },
      { key: "room_number", label: "Room number", type: "text" },
    ],
    item: {
      title: (r) => String(r.name),
      subtitle: (r, rel) => join(str(r.education_level), rel("class_teacher_id")),
      meta: (r) => join(r.capacity != null ? `Capacity ${r.capacity}` : null, r.room_number ? `Room ${r.room_number}` : null),
    },
  },
  {
    table: "streams",
    title: "Streams",
    writeRoles: ADMIN,
    fields: [
      { key: "name", label: "Stream name", type: "text", required: true, placeholder: "e.g. East, Blue" },
      { key: "class_id", label: "Class", type: "relation", relationTable: "classes", labelKey: "name", required: true },
    ],
    item: { title: (r) => String(r.name), subtitle: (_r, rel) => rel("class_id") },
  },
  {
    table: "departments",
    title: "Departments",
    writeRoles: ADMIN,
    fields: [{ key: "name", label: "Department name", type: "text", required: true, placeholder: "e.g. Academic, ICT, Sports" }],
    item: { title: (r) => String(r.name) },
  },
  {
    table: "subjects",
    title: "Subjects",
    writeRoles: ADMIN,
    fields: [
      { key: "name", label: "Subject name", type: "text", required: true },
      { key: "code", label: "Code", type: "text", placeholder: "e.g. MTC" },
    ],
    item: { title: (r) => String(r.name), subtitle: (r) => str(r.code) },
  },
  {
    table: "houses",
    title: "Houses",
    writeRoles: ADMIN,
    fields: [{ key: "name", label: "House name", type: "text", required: true }],
    item: { title: (r) => String(r.name) },
  },
  {
    table: "dormitories",
    title: "Dormitories",
    writeRoles: ADMIN,
    fields: [
      { key: "name", label: "Dormitory name", type: "text", required: true },
      { key: "capacity", label: "Capacity", type: "number" },
    ],
    item: { title: (r) => String(r.name), subtitle: (r) => (r.capacity != null ? `Capacity ${r.capacity}` : null) },
  },
  {
    table: "transport_routes",
    title: "Transport Routes",
    writeRoles: ADMIN,
    fields: [
      { key: "name", label: "Route name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
    item: { title: (r) => String(r.name), subtitle: (r) => str(r.description) },
  },
  {
    table: "guardians",
    title: "Guardians",
    writeRoles: ADMIN,
    fields: [
      { key: "full_name", label: "Full name", type: "text", required: true },
      { key: "relationship", label: "Relationship", type: "text", placeholder: "Parent, Grandparent, Guardian..." },
      { key: "phone", label: "Phone", type: "phone" },
      { key: "email", label: "Email", type: "email" },
      { key: "is_emergency_contact", label: "Emergency contact", type: "boolean-select", trueLabel: "Yes", falseLabel: "No" },
    ],
    item: {
      title: (r) => String(r.full_name),
      subtitle: (r) => join(str(r.relationship), str(r.phone) ?? str(r.email)),
      badge: (r) => (r.is_emergency_contact ? { label: "Emergency", tone: "success" } : null),
      avatar: true,
    },
  },
  {
    table: "fee_categories",
    title: "Fee Categories",
    writeRoles: ADMIN,
    fields: [
      { key: "name", label: "Category name", type: "text", required: true },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "class_id", label: "Class (optional)", type: "relation", relationTable: "classes", labelKey: "name" },
    ],
    item: { title: (r) => String(r.name), subtitle: (_r, rel) => rel("class_id"), meta: (r) => num(r.amount) },
  },
  {
    table: "fee_discounts",
    title: "Discounts & Scholarships",
    writeRoles: ADMIN,
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      {
        key: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { value: "percent", label: "Percentage" },
          { value: "fixed", label: "Fixed amount" },
        ],
      },
      { key: "amount", label: "Amount", type: "number", required: true },
    ],
    item: { title: (r) => String(r.name), meta: (r) => (r.type === "percent" ? `${r.amount}%` : num(r.amount)) },
  },
  {
    table: "payment_methods",
    title: "Payment Methods",
    writeRoles: ADMIN,
    fields: [{ key: "name", label: "Method name", type: "text", required: true, placeholder: "e.g. Mobile Money, Bank Transfer" }],
    item: { title: (r) => String(r.name) },
  },
  {
    table: "sports_teams",
    title: "Sports Teams",
    writeRoles: ADMIN,
    fields: [
      { key: "name", label: "Team name", type: "text", required: true },
      { key: "coach_id", label: "Coach", type: "relation", relationTable: "staff", labelKey: "full_name" },
    ],
    item: { title: (r) => String(r.name), subtitle: (_r, rel) => rel("coach_id") },
  },
  {
    table: "exam_types",
    title: "Exam Types",
    writeRoles: ADMIN,
    fields: [
      { key: "name", label: "Exam type", type: "text", required: true, placeholder: "e.g. Midterm, End of Term" },
      { key: "weight", label: "Weight (%)", type: "number" },
    ],
    item: { title: (r) => String(r.name), meta: (r) => (r.weight != null ? `${r.weight}%` : null) },
  },
  {
    table: "grade_bands",
    title: "Grading System",
    writeRoles: ADMIN,
    orderBy: "min_score",
    fields: [
      { key: "min_score", label: "Min score", type: "number", required: true },
      { key: "max_score", label: "Max score", type: "number", required: true },
      { key: "grade", label: "Grade", type: "text", required: true, placeholder: "e.g. A, D1" },
      { key: "remark", label: "Remark", type: "text", placeholder: "e.g. Distinction" },
    ],
    item: { title: (r) => String(r.grade), subtitle: (r) => str(r.remark), meta: (r) => `${r.min_score}–${r.max_score}` },
  },
];

// ---------------------------------------------------------------- Students

const studentsSection: SectionDef = {
  table: "students",
  title: "Students",
  actions: [{ label: "Bulk add", icon: "users", href: "/modules/bulk-students" }],
  orderBy: "full_name",
  searchable: true,
  writeRoles: ["school_admin", "teacher"],
  deleteRoles: [],
  fields: [
    { key: "full_name", label: "Full name", type: "text", required: true },
    { key: "admission_number", label: "Admission number", type: "text" },
    { key: "gender", label: "Gender", type: "select", options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ] },
    { key: "date_of_birth", label: "Date of birth", type: "date" },
    { key: "class_id", label: "Class", type: "relation", relationTable: "classes", labelKey: "name" },
    { key: "stream_id", label: "Stream", type: "relation", relationTable: "streams", labelKey: "name" },
    { key: "house_id", label: "House", type: "relation", relationTable: "houses", labelKey: "name" },
    { key: "dormitory_id", label: "Dormitory", type: "relation", relationTable: "dormitories", labelKey: "name" },
    { key: "transport_route_id", label: "Transport route", type: "relation", relationTable: "transport_routes", labelKey: "name" },
    { key: "guardian_id", label: "Guardian", type: "relation", relationTable: "guardians", labelKey: "full_name", virtual: true },
    { key: "status", label: "Status", type: "select", editOnly: true, options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "left", label: "Left" },
    ] },
  ],
  // Keep the legacy flat name columns in step with the FK ids, exactly as
  // the website does - the mobile team's older screens still read them.
  transform: (p, ctx) => {
    const out = { ...p };
    if ("class_id" in p) out.form_class = p.class_id ? ctx.labelFor("class_id", String(p.class_id)) : null;
    if ("house_id" in p) out.house = p.house_id ? ctx.labelFor("house_id", String(p.house_id)) : null;
    if ("dormitory_id" in p) out.dormitory = p.dormitory_id ? ctx.labelFor("dormitory_id", String(p.dormitory_id)) : null;
    if ("transport_route_id" in p)
      out.transport_route = p.transport_route_id ? ctx.labelFor("transport_route_id", String(p.transport_route_id)) : null;
    return out;
  },
  afterSave: async (studentId, ctx) => {
    const guardianId = ctx.values.guardian_id;
    if (!guardianId || ctx.isEdit) return null;
    const { data: g } = await supabase.from("guardians").select("full_name, phone, email").eq("id", guardianId).maybeSingle();
    if (g) {
      await supabase
        .from("students")
        .update({ guardian_name: g.full_name, guardian_phone: g.phone, guardian_email: g.email })
        .eq("id", studentId);
    }
    const { error } = await supabase
      .from("student_guardians")
      .insert({ school_id: ctx.schoolId, student_id: studentId, guardian_id: guardianId });
    return error ? `Student saved, but the guardian link failed: ${error.message}` : null;
  },
  item: {
    title: (r) => String(r.full_name),
    subtitle: (r, rel) => join(str(r.admission_number) ?? "No admission number", rel("class_id") ?? str(r.form_class)),
    meta: (r) => (r.guardian_name ? `Guardian: ${r.guardian_name}` : null),
    badge: tone({ active: "success" }),
    avatar: true,
  },
};

// ---------------------------------------------------------------- Modules

export const modules: ModuleDef[] = [
  {
    slug: "setup",
    label: "School Setup",
    icon: "settings",
    description: "Classes, streams, staff structure, subjects, departments and the other core data every other module relies on.",
    kind: "crud",
    sections: setupSections,
  },
  { slug: "students", label: "Student Management", icon: "users", description: "Student records, classes and guardians.", kind: "crud", sections: [studentsSection] },
  {
    slug: "admissions",
    label: "Admissions",
    icon: "clipboard",
    description: "Applications, offers and enrolment.",
    kind: "crud",
    sections: [
      {
        table: "admission_applications",
        title: "Applications",
        writeRoles: ["school_admin", "teacher"],
        searchable: true,
        fields: [
          { key: "applicant_name", label: "Applicant name", type: "text", required: true },
          { key: "date_of_birth", label: "Date of birth", type: "date" },
          { key: "applying_for_class", label: "Applying for class", type: "text" },
          { key: "guardian_name", label: "Guardian name", type: "text" },
          { key: "guardian_phone", label: "Guardian phone", type: "phone" },
          { key: "guardian_email", label: "Guardian email", type: "email" },
          { key: "status", label: "Status", type: "select", editOnly: true, required: true, options: [
            { value: "pending", label: "Pending" },
            { value: "offered", label: "Offered" },
            { value: "accepted", label: "Accepted" },
            { value: "rejected", label: "Rejected" },
          ] },
        ],
        item: {
          title: (r) => String(r.applicant_name),
          subtitle: (r) => join(r.applying_for_class ? `Applying for ${r.applying_for_class}` : null, str(r.guardian_name)),
          badge: tone({ pending: "warning", offered: "info", accepted: "success", rejected: "danger" }),
          avatar: true,
        },
      },
    ],
  },
  {
    slug: "attendance",
    label: "Attendance",
    icon: "check-square",
    description: "Daily attendance records.",
    kind: "crud",
    sections: [
      {
        table: "attendance_records",
        title: "Attendance",
        upsertOn: "student_id,date",
        actions: [{ label: "Registers", icon: "check-square", href: "/modules/register" }],
        orderBy: "date",
        // Class teachers take attendance; admins review it.
        writeRoles: ["teacher"],
        deleteRoles: [],
        fields: [
          student,
          { key: "date", label: "Date", type: "date", required: true },
          { key: "status", label: "Status", type: "select", required: true, options: [
            { value: "present", label: "Present" },
            { value: "absent", label: "Absent" },
            { value: "late", label: "Late" },
            { value: "excused", label: "Excused" },
          ] },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
        item: {
          title: (_r, rel) => rel("student_id") ?? "Student",
          subtitle: (r) => String(r.date),
          meta: (r) => str(r.notes),
          badge: tone({ present: "success", absent: "danger", late: "warning", excused: "neutral" }),
        },
      },
    ],
  },
  {
    slug: "behaviour",
    label: "Behaviour",
    icon: "alert-triangle",
    description: "Incidents, points, rewards and sanctions.",
    kind: "crud",
    sections: [
      {
        table: "behaviour_incidents",
        title: "Behaviour",
        writeRoles: ["school_admin", "teacher"],
        deleteRoles: [],
        fields: [
          student,
          { key: "type", label: "Type", type: "select", required: true, options: [
            { value: "positive", label: "Positive" },
            { value: "negative", label: "Negative" },
          ] },
          { key: "points", label: "Points", type: "number", placeholder: "0" },
          { key: "description", label: "Description", type: "textarea", required: true },
        ],
        item: {
          title: (_r, rel) => rel("student_id") ?? "Student",
          subtitle: (r) => String(r.description),
          meta: (r) => (r.points != null ? `${r.points} points` : null),
          badge: (r) => ({ label: String(r.type), tone: r.type === "positive" ? "success" : "danger" }),
        },
      },
    ],
  },
  {
    slug: "academic",
    label: "Academic",
    icon: "award",
    description: "Assessments, gradebooks and progress tracking.",
    kind: "crud",
    sections: [
      {
        table: "assessments",
        title: "Assessments",
        writeRoles: STAFF_EDIT,
        fields: [
          student,
          { key: "subject", label: "Subject", type: "text", required: true },
          { key: "term", label: "Term", type: "text" },
          { key: "score", label: "Score", type: "number" },
          { key: "max_score", label: "Max score", type: "number", placeholder: "100" },
          { key: "comments", label: "Comments", type: "textarea" },
        ],
        item: {
          title: (r) => String(r.subject),
          subtitle: (r, rel) => join(rel("student_id"), str(r.term)),
          meta: (r) => str(r.comments),
          badge: (r) => ({ label: `${r.score ?? "—"} / ${r.max_score}`, tone: "info" }),
        },
      },
    ],
  },
  {
    slug: "timetable",
    label: "Timetable",
    icon: "clock",
    description: "School, staff and student timetables.",
    kind: "crud",
    sections: [
      {
        table: "timetable_entries",
        title: "Timetable",
        orderBy: "day_of_week",
        writeRoles: STAFF_EDIT,
        fields: [
          { key: "class_name", label: "Class", type: "text", required: true },
          { key: "subject", label: "Subject", type: "text", required: true },
          { key: "day_of_week", label: "Day", type: "select", required: true, options: DAYS.map((d, i) => ({ value: String(i + 1), label: d })) },
          { key: "start_time", label: "Start time", type: "time", required: true },
          { key: "end_time", label: "End time", type: "time", required: true },
          { key: "teacher_id", label: "Teacher", type: "relation", relationTable: "profiles", labelKey: "full_name" },
          { key: "room", label: "Room", type: "text" },
        ],
        item: {
          title: (r) => `${r.subject} · ${r.class_name}`,
          subtitle: (r, rel) => join(DAYS[Number(r.day_of_week) - 1], rel("teacher_id")),
          meta: (r) => join(`${String(r.start_time).slice(0, 5)}–${String(r.end_time).slice(0, 5)}`, r.room ? `Room ${r.room}` : null),
        },
      },
    ],
  },
  {
    slug: "communication",
    label: "Communication",
    icon: "message-square",
    description: "Broadcast messages to parents, staff or students.",
    kind: "crud",
    sections: [
      {
        table: "messages",
        title: "Messages",
        writeRoles: STAFF_EDIT,
        fields: [
          { key: "subject", label: "Subject", type: "text", required: true },
          { key: "body", label: "Message", type: "textarea", required: true },
          { key: "audience", label: "Audience", type: "select", required: true, options: [
            { value: "all", label: "Everyone" },
            { value: "parents", label: "Parents" },
            { value: "staff", label: "Staff" },
            { value: "students", label: "Students" },
          ] },
        ],
        item: { title: (r) => String(r.subject), subtitle: (r) => String(r.body), badge: (r) => ({ label: String(r.audience), tone: "info" }) },
      },
    ],
  },
  { slug: "parents-portal", label: "Parents Portal", icon: "heart", description: "Your child's attendance, behaviour and fees.", kind: "screen" },
  { slug: "student-portal", label: "Student Portal", icon: "user", description: "Homework, timetable and results.", kind: "screen" },
  {
    slug: "fees",
    label: "Fees & Payments",
    icon: "credit-card",
    description: "School fees, invoices and payment status.",
    kind: "crud",
    sections: [
      {
        table: "fee_invoices",
        title: "Invoices",
        actions: [{ label: "Invoice a class", icon: "layers", href: "/modules/bulk-invoice" }],
        writeRoles: STAFF_EDIT,
        fields: [
          student,
          { key: "description", label: "Description", type: "text", required: true },
          { key: "amount", label: "Amount", type: "number", required: true },
          { key: "due_date", label: "Due date", type: "date" },
          { key: "status", label: "Status", type: "select", options: [
            { value: "unpaid", label: "Unpaid" },
            { value: "paid", label: "Paid" },
            { value: "overdue", label: "Overdue" },
          ] },
        ],
        item: {
          title: (r) => String(r.description),
          subtitle: (r, rel) => join(rel("student_id"), r.due_date ? `Due ${r.due_date}` : null),
          meta: (r) => num(r.amount),
          badge: tone({ paid: "success", unpaid: "warning", overdue: "danger" }),
        },
      },
    ],
  },
  {
    slug: "staff",
    label: "Staff Management",
    icon: "briefcase",
    description: "Add staff and their login emails, assign who teaches what, and handle leave requests.",
    kind: "crud",
    sections: [
      {
        table: "staff",
        title: "Staff roster",
        writeRoles: ADMIN,
        deleteRoles: [],
        searchable: true,
        fields: [
          { key: "staff_number", label: "Staff ID", type: "text" },
          { key: "full_name", label: "Full name", type: "text", required: true },
          { key: "email", label: "Email (for their OASIS login)", type: "email" },
          { key: "access_role", label: "Login access", type: "select", options: [
            { value: "teacher", label: "Teacher - registers & classes" },
            { value: "bursar", label: "Bursar - fees & payments" },
            { value: "librarian", label: "Librarian" },
          ] },
          { key: "gender", label: "Gender", type: "select", options: [
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ] },
          { key: "date_of_birth", label: "Date of birth", type: "date" },
          { key: "nationality", label: "Nationality", type: "text" },
          { key: "national_id", label: "National ID / Passport", type: "text" },
          { key: "tax_number", label: "Tax number", type: "text" },
          { key: "phone", label: "Phone", type: "phone" },
          { key: "address", label: "Address", type: "textarea" },
          { key: "job_title", label: "Job title / role", type: "text" },
          { key: "department_id", label: "Department", type: "relation", relationTable: "departments", labelKey: "name" },
          { key: "qualifications", label: "Qualifications", type: "textarea" },
          { key: "employment_date", label: "Employment date", type: "date" },
          { key: "salary", label: "Salary", type: "number" },
          { key: "emergency_contact_name", label: "Emergency contact name", type: "text" },
          { key: "emergency_contact_phone", label: "Emergency contact phone", type: "phone" },
          { key: "status", label: "Employment status", type: "select", options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "left", label: "Left" },
          ] },
        ],
        item: {
          title: (r) => String(r.full_name),
          subtitle: (r, rel) => join(str(r.job_title), rel("department_id") ?? str(r.department)),
          meta: (r) => (r.profile_id ? "Has an OASIS login" : r.email ? "No login yet - they can sign up with " + r.email : "Add an email so they can get a login"),
          badge: tone({ active: "success", left: "warning" }),
          avatar: true,
        },
      },
      {
        table: "subject_assignments",
        title: "Teaching assignments",
        writeRoles: ADMIN,
        fields: [
          { key: "teacher_id", label: "Teacher", type: "relation", relationTable: "staff", labelKey: "full_name", required: true },
          { key: "subject_id", label: "Subject", type: "relation", relationTable: "subjects", labelKey: "name", required: true },
          { key: "class_id", label: "Class", type: "relation", relationTable: "classes", labelKey: "name", required: true },
        ],
        item: {
          title: (_r, rel) => rel("teacher_id") ?? "Teacher",
          subtitle: (_r, rel) => join(rel("subject_id"), rel("class_id")),
        },
      },
      {
        table: "staff_leave_requests",
        title: "Leave requests",
        writeRoles: STAFF_EDIT,
        fields: [
          { key: "staff_id", label: "Staff member", type: "relation", relationTable: "staff", labelKey: "full_name", required: true },
          { key: "start_date", label: "Start date", type: "date", required: true },
          { key: "end_date", label: "End date", type: "date", required: true },
          { key: "reason", label: "Reason", type: "textarea" },
          { key: "status", label: "Status", type: "select", required: true, editOnly: true, roles: ADMIN, options: [
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ] },
        ],
        item: {
          title: (_r, rel) => rel("staff_id") ?? "Staff member",
          subtitle: (r) => `${r.start_date} → ${r.end_date}`,
          meta: (r) => str(r.reason),
          badge: tone({ approved: "success", rejected: "danger", pending: "warning" }),
        },
      },
    ],
  },
  {
    slug: "clubs",
    label: "Clubs & Activities",
    icon: "star",
    description: "Club creation, sign-up and membership.",
    kind: "crud",
    sections: [
      {
        table: "clubs",
        title: "Clubs",
        writeRoles: STAFF_EDIT,
        fields: [
          { key: "name", label: "Club name", type: "text", required: true },
          { key: "description", label: "Description", type: "textarea" },
          { key: "schedule", label: "Schedule", type: "text", placeholder: "e.g. Tuesdays 3:30pm" },
        ],
        item: { title: (r) => String(r.name), subtitle: (r) => str(r.schedule), meta: (r) => str(r.description) },
      },
      {
        table: "club_members",
        title: "Members",
        orderBy: "joined_at",
        writeRoles: STAFF_EDIT,
        fields: [{ key: "club_id", label: "Club", type: "relation", relationTable: "clubs", labelKey: "name", required: true }, student],
        item: {
          title: (_r, rel) => rel("student_id") ?? "Student",
          subtitle: (r, rel) => join(rel("club_id"), r.joined_at ? `Joined ${String(r.joined_at).slice(0, 10)}` : null),
        },
      },
    ],
  },
  {
    slug: "trips",
    label: "School Trips",
    icon: "map",
    description: "Trip planning, cost and parental consent.",
    kind: "crud",
    sections: [
      {
        table: "school_trips",
        title: "Trips",
        writeRoles: STAFF_EDIT,
        fields: [
          { key: "name", label: "Trip name", type: "text", required: true },
          { key: "destination", label: "Destination", type: "text" },
          { key: "trip_date", label: "Date", type: "date" },
          { key: "cost", label: "Cost", type: "number" },
        ],
        item: {
          title: (r) => String(r.name),
          subtitle: (r) => join(str(r.destination), str(r.trip_date)),
          meta: (r) => (r.cost != null ? num(r.cost) : null),
        },
      },
      {
        table: "trip_consents",
        title: "Consents",
        writeRoles: STAFF_EDIT,
        fields: [
          { key: "trip_id", label: "Trip", type: "relation", relationTable: "school_trips", labelKey: "name", required: true },
          student,
          { key: "consent_given", label: "Consent", type: "boolean-select", required: true, trueLabel: "Given", falseLabel: "Not given" },
        ],
        item: {
          title: (_r, rel) => rel("student_id") ?? "Student",
          subtitle: (_r, rel) => rel("trip_id"),
          badge: (r) => (r.consent_given ? { label: "Given", tone: "success" } : { label: "Not given", tone: "warning" }),
        },
      },
    ],
  },
  {
    slug: "medical",
    label: "Medical",
    icon: "activity",
    description: "Conditions, allergies, medication and care plans.",
    kind: "crud",
    sections: [
      {
        table: "medical_records",
        title: "Medical records",
        writeRoles: STAFF_EDIT,
        fields: [
          student,
          { key: "condition", label: "Condition", type: "text" },
          { key: "allergy", label: "Allergy", type: "text" },
          { key: "medication", label: "Medication", type: "text" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
        item: {
          title: (_r, rel) => rel("student_id") ?? "Student",
          subtitle: (r) => join(str(r.condition), r.allergy ? `Allergy: ${r.allergy}` : null),
          meta: (r) => join(r.medication ? `Medication: ${r.medication}` : null, str(r.notes)),
        },
      },
    ],
  },
  {
    slug: "safeguarding",
    label: "Safeguarding",
    icon: "shield",
    description: "Concerns and case management. Restricted to School Admin only.",
    kind: "crud",
    sections: [
      {
        table: "safeguarding_concerns",
        title: "Concerns",
        writeRoles: ADMIN,
        readRoles: ADMIN,
        fields: [
          { ...student, required: false },
          { key: "concern", label: "Concern", type: "textarea", required: true },
          { key: "status", label: "Status", type: "select", options: [
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ] },
        ],
        item: {
          title: (r) => String(r.concern),
          subtitle: (_r, rel) => rel("student_id"),
          badge: (r) => (r.status ? { label: String(r.status), tone: r.status === "open" ? "warning" : "success" } : null),
        },
      },
    ],
  },
  {
    slug: "send",
    label: "SEND",
    icon: "life-buoy",
    description: "SEN register and support plans.",
    kind: "crud",
    sections: [
      {
        table: "send_records",
        title: "SEN register",
        writeRoles: STAFF_EDIT,
        fields: [
          student,
          { key: "need_type", label: "Need type", type: "text", required: true },
          { key: "support_plan", label: "Support plan", type: "textarea" },
          { key: "review_date", label: "Review date", type: "date" },
        ],
        item: {
          title: (_r, rel) => rel("student_id") ?? "Student",
          subtitle: (r) => String(r.need_type),
          meta: (r) => join(str(r.support_plan), r.review_date ? `Review ${r.review_date}` : null),
        },
      },
    ],
  },
  { slug: "reporting", label: "Reporting", icon: "bar-chart-2", description: "Live counts across student, attendance, finance and academic data.", kind: "screen" },
  {
    slug: "calendar",
    label: "Calendar",
    icon: "calendar",
    description: "Term dates, events and school calendar.",
    kind: "crud",
    sections: [
      {
        table: "calendar_events",
        title: "Events",
        orderBy: "event_date",
        writeRoles: STAFF_EDIT,
        fields: [
          { key: "title", label: "Title", type: "text", required: true },
          { key: "event_date", label: "Date", type: "date", required: true },
          { key: "event_type", label: "Type", type: "text", placeholder: "e.g. Holiday, Exam, Meeting" },
          { key: "description", label: "Description", type: "textarea" },
        ],
        item: {
          title: (r) => String(r.title),
          subtitle: (r) => String(r.event_date),
          meta: (r) => str(r.description),
          badge: (r) => (r.event_type ? { label: String(r.event_type), tone: "info" } : null),
        },
      },
    ],
  },
  {
    slug: "exams",
    label: "Exams",
    icon: "file-text",
    description: "Entries, seat numbers and results.",
    kind: "crud",
    sections: [
      {
        table: "exam_entries",
        title: "Exam entries",
        writeRoles: STAFF_EDIT,
        fields: [
          student,
          { key: "exam_name", label: "Exam", type: "text", required: true },
          { key: "subject", label: "Subject", type: "text", required: true },
          { key: "exam_date", label: "Date", type: "date" },
          { key: "seat_number", label: "Seat number", type: "text" },
          { key: "result", label: "Result", type: "text" },
        ],
        item: {
          title: (r) => `${r.exam_name} · ${r.subject}`,
          subtitle: (r, rel) => join(rel("student_id"), str(r.exam_date)),
          meta: (r) => (r.seat_number ? `Seat ${r.seat_number}` : null),
          badge: (r) => (r.result ? { label: String(r.result), tone: "info" } : null),
        },
      },
    ],
  },
  { slug: "ai-features", label: "AI Features", icon: "zap", description: "AI assistant, student summaries, draft emails, smart reports.", kind: "screen" },
  { slug: "school-analytics", label: "School Analytics", icon: "trending-up", description: "Attendance, behaviour and academic trends, computed live from real records.", kind: "screen" },
];

export function findModule(slug: string) {
  return modules.find((m) => m.slug === slug);
}
