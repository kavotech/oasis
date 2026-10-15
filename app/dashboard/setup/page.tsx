"use client";

import Link from "next/link";
import { PageHeader } from "@/components/portal/PageHeader";
import { Badge } from "@/components/portal/ui/Badge";
import { SimpleModule, type FieldDef } from "@/components/school/SimpleModule";
import { OnboardingChecklist } from "@/components/school/OnboardingChecklist";
import type { Tables } from "@/types/database.types";

export default function SetupPage() {
  return (
    <div>
      <PageHeader
        title="School Setup"
        description="Classes, streams, staff structure, subjects, departments and the other core data every other module relies on."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "School Setup" }]}
      />

      <OnboardingChecklist />

      <Link
        href="/dashboard/setup/import"
        className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-oasis-200 bg-oasis-50/70 px-5 py-4 transition hover:bg-oasis-50"
      >
        <span>
          <span className="block text-sm font-semibold text-oasis-800">Import your students and parents</span>
          <span className="block text-xs text-oasis-700">Paste a sheet from Excel or upload a CSV - siblings are linked to the same parent automatically.</span>
        </span>
        <span className="text-sm font-semibold text-oasis-700">Import →</span>
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SimpleModule<Tables<"classes">>
          table="classes"
          title="Classes"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "name", label: "Class name", type: "text", required: true, placeholder: "e.g. P1, S2" },
            { key: "education_level", label: "Education level", type: "text", placeholder: "Nursery, Primary, Secondary..." },
            { key: "academic_year", label: "Academic year", type: "text", placeholder: "2026" },
            { key: "capacity", label: "Capacity", type: "number" },
            { key: "class_teacher_id", label: "Class teacher", type: "relation", relationTable: "staff", labelKey: "full_name" },
            { key: "room_number", label: "Room number", type: "text" },
          ]}
          columns={[
            { key: "name", header: "Class", render: (r) => <p className="font-medium text-slate-800">{r.name}</p> },
            { key: "level", header: "Level", render: (r) => r.education_level || "—" },
            { key: "capacity", header: "Capacity", render: (r) => r.capacity ?? "—" },
            { key: "room", header: "Room", render: (r) => r.room_number || "—" },
          ]}
        />

        <SimpleModule<Tables<"streams">>
          table="streams"
          title="Streams"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "name", label: "Stream name", type: "text", required: true, placeholder: "e.g. East, Blue" },
            { key: "class_id", label: "Class", type: "relation", relationTable: "classes", labelKey: "name", required: true },
          ]}
          columns={[{ key: "name", header: "Stream", render: (r) => r.name }]}
        />

        <SimpleModule<Tables<"departments">>
          table="departments"
          title="Departments"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[{ key: "name", label: "Department name", type: "text", required: true, placeholder: "e.g. Academic, ICT, Sports" }]}
          columns={[{ key: "name", header: "Department", render: (r) => r.name }]}
        />

        <SimpleModule<Tables<"subjects">>
          table="subjects"
          title="Subjects"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "name", label: "Subject name", type: "text", required: true },
            { key: "code", label: "Code", type: "text", placeholder: "e.g. MTC" },
          ]}
          columns={[
            { key: "name", header: "Subject", render: (r) => r.name },
            { key: "code", header: "Code", render: (r) => r.code || "—" },
          ]}
        />

        <SimpleModule<Tables<"houses">>
          table="houses"
          title="Houses"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[{ key: "name", label: "House name", type: "text", required: true }]}
          columns={[{ key: "name", header: "House", render: (r) => r.name }]}
        />

        <SimpleModule<Tables<"dormitories">>
          table="dormitories"
          title="Dormitories"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "name", label: "Dormitory name", type: "text", required: true },
            { key: "capacity", label: "Capacity", type: "number" },
          ]}
          columns={[
            { key: "name", header: "Dormitory", render: (r) => r.name },
            { key: "capacity", header: "Capacity", render: (r) => r.capacity ?? "—" },
          ]}
        />

        <SimpleModule<Tables<"transport_routes">>
          table="transport_routes"
          title="Transport Routes"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "name", label: "Route name", type: "text", required: true },
            { key: "description", label: "Description", type: "textarea" },
          ]}
          columns={[{ key: "name", header: "Route", render: (r) => r.name }]}
        />

        <SimpleModule<Tables<"guardians">>
          table="guardians"
          title="Guardians"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "full_name", label: "Full name", type: "text", required: true },
            { key: "relationship", label: "Relationship", type: "text", placeholder: "Parent, Grandparent, Guardian..." },
            { key: "phone", label: "Phone", type: "text" },
            { key: "email", label: "Email", type: "email" },
            { key: "is_emergency_contact", label: "Emergency contact", type: "boolean-select", trueLabel: "Yes", falseLabel: "No" },
          ]}
          columns={[
            { key: "name", header: "Name", render: (r) => r.full_name },
            { key: "relationship", header: "Relationship", render: (r) => r.relationship || "—" },
            { key: "contact", header: "Contact", render: (r) => r.phone || r.email || "—" },
            { key: "emergency", header: "Emergency contact", render: (r) => <Badge tone={r.is_emergency_contact ? "success" : "neutral"}>{r.is_emergency_contact ? "Yes" : "No"}</Badge> },
          ]}
        />

        <SimpleModule<Tables<"fee_categories">>
          table="fee_categories"
          title="Fee Categories"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "name", label: "Category name", type: "text", required: true },
            { key: "amount", label: "Amount", type: "number", required: true },
            { key: "class_id", label: "Class (optional)", type: "relation", relationTable: "classes", labelKey: "name" },
          ]}
          columns={[
            { key: "name", header: "Category", render: (r) => r.name },
            { key: "amount", header: "Amount", render: (r) => r.amount.toLocaleString() },
          ]}
        />

        <SimpleModule<Tables<"fee_discounts">>
          table="fee_discounts"
          title="Discounts & Scholarships"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
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
          ]}
          columns={[
            { key: "name", header: "Name", render: (r) => r.name },
            { key: "amount", header: "Value", render: (r) => (r.type === "percent" ? `${r.amount}%` : r.amount.toLocaleString()) },
          ]}
        />

        <SimpleModule<Tables<"payment_methods">>
          table="payment_methods"
          title="Payment Methods"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[{ key: "name", label: "Method name", type: "text", required: true, placeholder: "e.g. Mobile Money, Bank Transfer" }]}
          columns={[{ key: "name", header: "Method", render: (r) => r.name }]}
        />

        <SimpleModule<Tables<"sports_teams">>
          table="sports_teams"
          title="Sports Teams"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "name", label: "Team name", type: "text", required: true },
            { key: "coach_id", label: "Coach", type: "relation", relationTable: "staff", labelKey: "full_name" },
          ]}
          columns={[{ key: "name", header: "Team", render: (r) => r.name }]}
        />

        <SimpleModule<Tables<"exam_types">>
          table="exam_types"
          title="Exam Types"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "name", label: "Exam type", type: "text", required: true, placeholder: "e.g. Midterm, End of Term" },
            { key: "weight", label: "Weight (%)", type: "number" },
          ]}
          columns={[
            { key: "name", header: "Type", render: (r) => r.name },
            { key: "weight", header: "Weight", render: (r) => (r.weight != null ? `${r.weight}%` : "—") },
          ]}
        />

        <SimpleModule<Tables<"grade_bands">>
          table="grade_bands"
          title="Grading System"
          description=""
          compact
          writeRoles={["school_admin"]}
          fields={[
            { key: "min_score", label: "Min score", type: "number", required: true },
            { key: "max_score", label: "Max score", type: "number", required: true },
            { key: "grade", label: "Grade", type: "text", required: true, placeholder: "e.g. A, D1" },
            { key: "remark", label: "Remark", type: "text", placeholder: "e.g. Distinction" },
          ]}
          columns={[
            { key: "range", header: "Range", render: (r) => `${r.min_score}–${r.max_score}` },
            { key: "grade", header: "Grade", render: (r) => r.grade },
            { key: "remark", header: "Remark", render: (r) => r.remark || "—" },
          ]}
        />
      </div>
    </div>
  );
}
