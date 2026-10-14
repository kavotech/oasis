"use client";

import { Badge } from "@/components/portal/ui/Badge";
import { Layers } from "lucide-react";
import { ButtonLink } from "@/components/portal/ui/Button";
import { SimpleModule, type FieldDef } from "@/components/school/SimpleModule";
import type { Tables } from "@/types/database.types";

type Row = Tables<"fee_invoices">;

const STATUS_TONE: Record<string, "success" | "danger" | "warning"> = {
  paid: "success",
  unpaid: "warning",
  overdue: "danger",
};

const fields: FieldDef[] = [
  { key: "student_id", label: "Student", type: "relation", relationTable: "students", labelKey: "full_name", required: true },
  { key: "description", label: "Description", type: "text", required: true },
  { key: "amount", label: "Amount", type: "number", required: true },
  { key: "due_date", label: "Due date", type: "date" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "unpaid", label: "Unpaid" },
      { value: "paid", label: "Paid" },
      { value: "overdue", label: "Overdue" },
    ],
  },
];

export default function FeesPage() {
  return (
    <SimpleModule<Row>
      table="fee_invoices"
      title="Fees & Payments"
      headerActions={
        <ButtonLink href="/dashboard/fees/bulk">
          <Layers className="h-4 w-4" /> Invoice a class
        </ButtonLink>
      }
      description="School fees, invoices and payment status."
      fields={fields}
      writeRoles={["school_admin", "teacher", "bursar"]}
      deleteRoles={["school_admin"]}
      columns={[
        { key: "description", header: "Description", render: (r) => r.description },
        { key: "amount", header: "Amount", render: (r) => r.amount.toLocaleString() },
        { key: "due", header: "Due date", render: (r) => r.due_date || "—" },
        { key: "status", header: "Status", render: (r) => <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge> },
      ]}
    />
  );
}
