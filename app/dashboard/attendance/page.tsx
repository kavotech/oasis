"use client";

import { Badge } from "@/components/portal/ui/Badge";
import { ClipboardCheck } from "lucide-react";
import { ButtonLink } from "@/components/portal/ui/Button";
import { SimpleModule, type FieldDef } from "@/components/school/SimpleModule";
import type { Tables } from "@/types/database.types";

type Row = Tables<"attendance_records">;

const STATUS_TONE: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  present: "success",
  absent: "danger",
  late: "warning",
  excused: "neutral",
};

const fields: FieldDef[] = [
  { key: "student_id", label: "Student", type: "relation", relationTable: "students", labelKey: "full_name", required: true },
  { key: "date", label: "Date", type: "date", required: true },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "present", label: "Present" },
      { value: "absent", label: "Absent" },
      { value: "late", label: "Late" },
      { value: "excused", label: "Excused" },
    ],
  },
  { key: "notes", label: "Notes", type: "textarea" },
];

export default function AttendancePage() {
  return (
    <SimpleModule<Row>
      table="attendance_records"
      title="Attendance"
      upsertOn="student_id,date"
      headerActions={
        <ButtonLink href="/dashboard/attendance/register">
          <ClipboardCheck className="h-4 w-4" /> Registers
        </ButtonLink>
      }
      description="Daily attendance records."
      orderBy="date"
      fields={fields}
      writeRoles={["teacher"]}
      deleteRoles={[]}
      columns={[
        { key: "date", header: "Date", render: (r) => r.date },
        { key: "status", header: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
        { key: "notes", header: "Notes", render: (r) => r.notes || "—" },
      ]}
    />
  );
}
