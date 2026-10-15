"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Upload, Users } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/ui/Card";
import { Table, type Column } from "@/components/portal/ui/Table";
import { Button, ButtonLink } from "@/components/portal/ui/Button";
import { Drawer } from "@/components/portal/ui/Drawer";
import { Input, Select, SearchInput } from "@/components/portal/ui/Input";
import { Avatar } from "@/components/portal/ui/Avatar";
import { Badge } from "@/components/portal/ui/Badge";
import { Field } from "@/components/school/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { useOpenOnAddParam } from "@/hooks/useOpenOnAddParam";
import { useDebounce } from "@/hooks/useDebounce";
import type { Tables } from "@/types/database.types";

type Student = Tables<"students">;

export default function StudentsPage() {
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const { rows, loading } = useRealtimeRows<Student>("students", "full_name");
  const { rows: classes } = useRealtimeRows<Tables<"classes">>("classes", "name");
  const { rows: streams } = useRealtimeRows<Tables<"streams">>("streams", "name");
  const { rows: houses } = useRealtimeRows<Tables<"houses">>("houses", "name");
  const { rows: dormitories } = useRealtimeRows<Tables<"dormitories">>("dormitories", "name");
  const { rows: transportRoutes } = useRealtimeRows<Tables<"transport_routes">>("transport_routes", "name");
  const { rows: guardians } = useRealtimeRows<Tables<"guardians">>("guardians", "full_name");
  const canWrite = role === "school_admin" || role === "teacher";

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query);
  const filtered = rows.filter((s) => !debouncedQuery.trim() || s.full_name.toLowerCase().includes(debouncedQuery.trim().toLowerCase()));

  const [open, setOpen] = useState(false);
  useOpenOnAddParam(canWrite, () => setOpen(true));
  const [fullName, setFullName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [classId, setClassId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [houseId, setHouseId] = useState("");
  const [dormitoryId, setDormitoryId] = useState("");
  const [transportRouteId, setTransportRouteId] = useState("");
  const [dob, setDob] = useState("");
  const [guardianId, setGuardianId] = useState("");
  const [saving, setSaving] = useState(false);

  const streamsForClass = classId ? streams.filter((s) => s.class_id === classId) : [];

  function resetForm() {
    setFullName("");
    setAdmissionNumber("");
    setClassId("");
    setStreamId("");
    setHouseId("");
    setDormitoryId("");
    setTransportRouteId("");
    setDob("");
    setGuardianId("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile?.school_id || !fullName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const selectedClass = classes.find((c) => c.id === classId);
    const selectedGuardian = guardians.find((g) => g.id === guardianId);
    const { data: student, error } = await supabase
      .from("students")
      .insert({
        school_id: profile.school_id,
        full_name: fullName.trim(),
        admission_number: admissionNumber.trim() || null,
        class_id: classId || null,
        stream_id: streamId || null,
        form_class: selectedClass?.name || null,
        house_id: houseId || null,
        house: houses.find((h) => h.id === houseId)?.name || null,
        dormitory_id: dormitoryId || null,
        dormitory: dormitories.find((d) => d.id === dormitoryId)?.name || null,
        transport_route_id: transportRouteId || null,
        transport_route: transportRoutes.find((t) => t.id === transportRouteId)?.name || null,
        date_of_birth: dob || null,
        guardian_name: selectedGuardian?.full_name || null,
        guardian_phone: selectedGuardian?.phone || null,
        guardian_email: selectedGuardian?.email || null,
      })
      .select("id")
      .single();

    if (error || !student) {
      setSaving(false);
      toast("error", "Couldn't add student", error?.message || "");
      return;
    }

    if (guardianId) {
      const { error: linkError } = await supabase.from("student_guardians").insert({
        school_id: profile.school_id,
        student_id: student.id,
        guardian_id: guardianId,
      });
      if (linkError) {
        toast("error", "Student added, but guardian link failed", linkError.message);
      }
    }

    setSaving(false);
    setOpen(false);
    resetForm();
    toast("success", "Student added", "");
  }

  const columns: Column<Student>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.full_name} />
          <div>
            <p className="font-medium text-slate-800">{r.full_name}</p>
            <p className="text-xs text-slate-400">{r.admission_number || "No admission number"}</p>
          </div>
        </div>
      ),
    },
    { key: "class", header: "Class", render: (r) => (r.class_id && classById.get(r.class_id)?.name) || r.form_class || "—" },
    { key: "house", header: "House", render: (r) => r.house || "—" },
    { key: "guardian", header: "Guardian", render: (r) => r.guardian_name || "—" },
    { key: "status", header: "Status", render: (r) => <Badge tone={r.status === "active" ? "success" : "neutral"}>{r.status}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Student Management"
        description="Personal info, admission number, class, house, guardian contacts."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Student Management" }]}
        action={
          canWrite && (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/dashboard/setup/import">
                <Upload className="h-4 w-4" /> Import with parents
              </ButtonLink>
              <ButtonLink href="/dashboard/students/bulk">
                <Users className="h-4 w-4" /> Bulk add
              </ButtonLink>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> Add student
              </Button>
            </div>
          )
        }
      />

      <Card className="p-0">
        <div className="border-b border-slate-100 p-4">
          <SearchInput placeholder="Search students..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
        </div>
        <Table columns={columns} rows={filtered} loading={loading} emptyTitle="No students yet" />
      </Card>

      <Drawer open={open} onClose={() => setOpen(false)} title="Add student" width={480}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Admission number">
            <Input value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} />
          </Field>
          <Field label="Class">
            <Select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setStreamId("");
              }}
            >
              <option value="">Select class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {classId && (
            <Field label="Stream">
              <Select value={streamId} onChange={(e) => setStreamId(e.target.value)} disabled={streamsForClass.length === 0}>
                <option value="">{streamsForClass.length ? "Select stream…" : "No streams for this class"}</option>
                {streamsForClass.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="House">
            <Select value={houseId} onChange={(e) => setHouseId(e.target.value)}>
              <option value="">Select house…</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dormitory">
            <Select value={dormitoryId} onChange={(e) => setDormitoryId(e.target.value)}>
              <option value="">Select dormitory…</option>
              {dormitories.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Transport route">
            <Select value={transportRouteId} onChange={(e) => setTransportRouteId(e.target.value)}>
              <option value="">Select route…</option>
              {transportRoutes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date of birth">
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
          <Field label="Guardian">
            <Select value={guardianId} onChange={(e) => setGuardianId(e.target.value)}>
              <option value="">Select guardian…</option>
              {guardians.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                  {g.relationship ? ` (${g.relationship})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add student"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
