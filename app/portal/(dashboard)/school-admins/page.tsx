"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/ui/Card";
import { Badge } from "@/components/portal/ui/Badge";
import { Button } from "@/components/portal/ui/Button";
import { Modal } from "@/components/portal/ui/Modal";
import { Input, SearchInput, Select } from "@/components/portal/ui/Input";
import { Field } from "@/components/school/Field";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { platformAction } from "@/lib/platform";
import type { Tables } from "@/types/database.types";

/** Every school administrator on the platform: active logins, and people
 * invited (added as administrator staff) who haven't signed up yet. */
export default function SchoolAdminsPage() {
  const { toast } = useToast();
  const { rows: profiles } = useRealtimeRows<Tables<"profiles">>("profiles");
  const { rows: schools } = useRealtimeRows<Tables<"schools">>("schools", "name");
  const { rows: staff } = useRealtimeRows<Tables<"staff">>("staff", "full_name");
  const [query, setQuery] = useState("");
  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ school_id: "", full_name: "", email: "" });
  const [saving, setSaving] = useState(false);

  const schoolName = useMemo(() => new Map(schools.map((s) => [s.id, s.name])), [schools]);
  const admins = profiles.filter((p) => p.role === "school_admin");
  const invites = staff.filter((s) => s.access_role === "school_admin" && !s.profile_id);
  const q = query.trim().toLowerCase();
  const match = (...vals: (string | null | undefined)[]) => !q || vals.some((v) => v?.toLowerCase().includes(q));
  const ids = useMemo(() => admins.map((a) => a.id).sort().join(","), [admins]);

  useEffect(() => {
    if (!ids) return;
    platformAction({ action: "list_access", user_ids: ids.split(",") }).then(({ data }) => setBanned(new Set((data?.banned as string[]) ?? [])));
  }, [ids]);

  async function toggle(p: Tables<"profiles">) {
    const revoke = !banned.has(p.id);
    if (revoke && !window.confirm(`Remove ${p.full_name ?? p.email}'s access?`)) return;
    setBusy(p.id);
    const { error } = await platformAction({ action: "set_user_access", user_id: p.id, revoked: revoke });
    setBusy(null);
    if (error) return toast("error", "Couldn't change access", error);
    setBanned((b) => {
      const n = new Set(b);
      if (revoke) n.add(p.id);
      else n.delete(p.id);
      return n;
    });
  }

  async function add() {
    if (!form.school_id || !form.full_name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return toast("error", "Fill in the school, name and a valid email", "");
    }
    setSaving(true);
    const { error } = await createClient()
      .from("staff")
      .insert({ school_id: form.school_id, full_name: form.full_name.trim(), email: form.email.trim().toLowerCase(), access_role: "school_admin", job_title: "Administrator", status: "active" });
    setSaving(false);
    if (error) return toast("error", "Couldn't add administrator", error.message);
    setOpen(false);
    toast("success", "Administrator added", `${form.email.trim()} can now sign up as staff of ${schoolName.get(form.school_id)}.`);
    setForm({ school_id: "", full_name: "", email: "" });
  }

  return (
    <div>
      <PageHeader
        title="School administrators"
        description="Admins, ICT and data managers across every school. Add one to any school, or remove access instantly."
        breadcrumbs={[{ label: "Dashboard", href: "/portal/dashboard" }, { label: "School administrators" }]}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add administrator
          </Button>
        }
      />
      <div className="mb-4 max-w-sm">
        <SearchInput placeholder="Search name, email or school…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <Card className="mb-5 p-0">
        <div className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-800">Active logins ({admins.length})</div>
        {admins
          .filter((a) => match(a.full_name, a.email, a.school_id ? schoolName.get(a.school_id) : null))
          .map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{a.full_name || a.email}</p>
                <p className="text-xs text-slate-500">
                  {a.email} ·{" "}
                  {a.school_id ? (
                    <Link href={`/portal/schools/${a.school_id}`} className="text-oasis-600 hover:underline">
                      {schoolName.get(a.school_id) ?? "Unknown school"}
                    </Link>
                  ) : (
                    "No school"
                  )}
                </p>
              </div>
              {banned.has(a.id) && <Badge tone="danger">Access removed</Badge>}
              <Button size="sm" variant={banned.has(a.id) ? "secondary" : "danger"} onClick={() => toggle(a)} loading={busy === a.id}>
                {banned.has(a.id) ? "Restore" : <><ShieldOff className="h-3.5 w-3.5" /> Remove access</>}
              </Button>
            </div>
          ))}
      </Card>

      <Card className="p-0">
        <div className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-800">Invited, not signed up yet ({invites.length})</div>
        {invites.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">No pending invitations.</p>
        ) : (
          invites
            .filter((i) => match(i.full_name, i.email, schoolName.get(i.school_id)))
            .map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm last:border-0">
                <span>
                  <span className="font-semibold text-slate-800">{i.full_name}</span>
                  <span className="block text-xs text-slate-500">
                    {i.email} · {schoolName.get(i.school_id)}
                  </span>
                </span>
                <Badge tone="warning">Invited</Badge>
              </div>
            ))
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a school administrator"
        description="They sign up as staff of that school with this email and get full admin access."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={add} loading={saving}>
              Add administrator
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="School">
            <Select value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })}>
              <option value="">Select school…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Full name">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
