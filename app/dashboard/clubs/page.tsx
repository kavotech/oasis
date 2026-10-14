"use client";

import { PageHeader } from "@/components/portal/PageHeader";
import { SimpleModule, type FieldDef } from "@/components/school/SimpleModule";
import type { Tables } from "@/types/database.types";

type Club = Tables<"clubs">;
type Member = Tables<"club_members">;

const clubFields: FieldDef[] = [
  { key: "name", label: "Club name", type: "text", required: true },
  { key: "description", label: "Description", type: "textarea" },
  { key: "schedule", label: "Schedule", type: "text", placeholder: "e.g. Tuesdays 3:30pm" },
];

const memberFields: FieldDef[] = [
  { key: "club_id", label: "Club", type: "relation", relationTable: "clubs", labelKey: "name", required: true },
  { key: "student_id", label: "Student", type: "relation", relationTable: "students", labelKey: "full_name", required: true },
];

export default function ClubsPage() {
  return (
    <div>
      <PageHeader
        title="Clubs & Activities"
        description="Club creation, sign-up and membership."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Clubs & Activities" }]}
      />

      <div className="mb-6">
        <SimpleModule<Club>
          table="clubs"
          title="Clubs"
          description=""
          fields={clubFields}
          writeRoles={["school_admin", "teacher", "bursar"]}
          deleteRoles={["school_admin"]}
          compact
          columns={[
            { key: "name", header: "Name", render: (r) => <p className="font-medium text-slate-800">{r.name}</p> },
            { key: "schedule", header: "Schedule", render: (r) => r.schedule || "—" },
            { key: "description", header: "Description", render: (r) => r.description || "—" },
          ]}
        />
      </div>

      <SimpleModule<Member>
        table="club_members"
        orderBy="joined_at"
        title="Members"
        description=""
        fields={memberFields}
        writeRoles={["school_admin", "teacher", "bursar"]}
        deleteRoles={["school_admin"]}
        compact
        columns={[
          { key: "joined", header: "Joined", render: (r) => r.joined_at?.slice(0, 10) },
        ]}
      />
    </div>
  );
}
