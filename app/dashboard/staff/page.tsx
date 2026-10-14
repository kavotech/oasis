"use client";

import { useMemo } from "react";
import { Badge } from "@/components/portal/ui/Badge";
import { PageHeader } from "@/components/portal/PageHeader";
import { SimpleModule, type FieldDef } from "@/components/school/SimpleModule";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import type { Tables } from "@/types/database.types";

type Staff = Tables<"staff">;
type LeaveRequest = Tables<"staff_leave_requests">;

const staffFields: FieldDef[] = [
  { key: "staff_number", label: "Staff ID", type: "text" },
  { key: "full_name", label: "Full name", type: "text", required: true },
  { key: "email", label: "Email (for their OASIS login)", type: "email" },
  { key: "access_role", label: "Login access", type: "select", options: [
    { value: "teacher", label: "Teacher - registers & their classes" },
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
  { key: "phone", label: "Phone", type: "text" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "job_title", label: "Job title / role", type: "text" },
  { key: "department_id", label: "Department", type: "relation", relationTable: "departments", labelKey: "name" },
  { key: "qualifications", label: "Qualifications", type: "textarea" },
  { key: "employment_date", label: "Employment date", type: "date" },
  { key: "salary", label: "Salary", type: "number" },
  { key: "emergency_contact_name", label: "Emergency contact name", type: "text" },
  { key: "emergency_contact_phone", label: "Emergency contact phone", type: "text" },
  { key: "status", label: "Employment status", type: "select", options: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "left", label: "Left" },
  ] },
];

const leaveFields: FieldDef[] = [
  { key: "staff_id", label: "Staff member", type: "relation", relationTable: "staff", labelKey: "full_name", required: true },
  { key: "start_date", label: "Start date", type: "date", required: true },
  { key: "end_date", label: "End date", type: "date", required: true },
  { key: "reason", label: "Reason", type: "textarea" },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    editOnly: true,
    roles: ["school_admin"],
    options: [
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
    ],
  },
];

export default function StaffPage() {
  const { rows: departments } = useRealtimeRows<Tables<"departments">>("departments", "name");
  const departmentById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  return (
    <div>
      <PageHeader
        title="Staff Management"
        description="Add your staff, then assign class teachers (in School Setup) and teaching subjects below. Staff sign up with the email you add here and see only their own classes."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Staff Management" }]}
      />

      <div className="mb-6">
        <SimpleModule<Staff>
          table="staff"
          title="Staff roster"
          description=""
          fields={staffFields}
          writeRoles={["school_admin"]}
          deleteRoles={[]}
          compact
          answerAddParam
          columns={[
            { key: "name", header: "Name", render: (r) => <p className="font-medium text-slate-800">{r.full_name}</p> },
            { key: "title", header: "Job title", render: (r) => r.job_title || "—" },
            { key: "dept", header: "Department", render: (r) => (r.department_id && departmentById.get(r.department_id)) || r.department || "—" },
            {
              key: "login",
              header: "OASIS login",
              render: (r) =>
                r.profile_id ? (
                  <Badge tone="success">Active</Badge>
                ) : r.email ? (
                  <span className="text-xs text-slate-500">Can sign up with {r.email}</span>
                ) : (
                  <span className="text-xs text-amber-700">Add an email</span>
                ),
            },
            { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "active" ? "success" : "neutral"}>{r.status}</Badge> },
          ]}
        />
      </div>

      <div className="mb-6">
        <SimpleModule<Tables<"subject_assignments">>
          table="subject_assignments"
          title="Teaching assignments"
          description=""
          writeRoles={["school_admin"]}
          compact
          fields={[
            { key: "teacher_id", label: "Teacher", type: "relation", relationTable: "staff", labelKey: "full_name", required: true },
            { key: "subject_id", label: "Subject", type: "relation", relationTable: "subjects", labelKey: "name", required: true },
            { key: "class_id", label: "Class", type: "relation", relationTable: "classes", labelKey: "name", required: true },
          ]}
          columns={[]}
        />
      </div>

      <SimpleModule<LeaveRequest>
        table="staff_leave_requests"
        title="Leave requests"
        description=""
        fields={leaveFields}
        writeRoles={["school_admin", "teacher", "bursar"]}
        deleteRoles={["school_admin"]}
        compact
        columns={[
          { key: "dates", header: "Dates", render: (r) => `${r.start_date} → ${r.end_date}` },
          { key: "reason", header: "Reason", render: (r) => r.reason || "—" },
          {
            key: "status",
            header: "Status",
            render: (r) => <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{r.status}</Badge>,
          },
        ]}
      />
    </div>
  );
}
