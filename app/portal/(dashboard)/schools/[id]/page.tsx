"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, CheckCircle2, Download, FileText, Loader2, MessageCircleQuestion, ShieldOff, Trash2, UserPlus, Users, XCircle } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card, CardHeader } from "@/components/portal/ui/Card";
import { Badge } from "@/components/portal/ui/Badge";
import { Button } from "@/components/portal/ui/Button";
import { Input } from "@/components/portal/ui/Input";
import { Modal } from "@/components/portal/ui/Modal";
import { EmptyState } from "@/components/portal/ui/EmptyState";
import { SchoolLogo } from "@/components/auth/SchoolCombobox";
import { AiFileReader } from "@/components/school/AiFileReader";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { formatBytes, signedUrl } from "@/lib/school-uploads";
import { platformAction, STATUS_LABEL, STATUS_TONE } from "@/lib/platform";
import { cn } from "@/lib/utils/cn";
import type { Tables } from "@/types/database.types";

const TABS = [
  { key: "application", label: "Application", icon: Building2 },
  { key: "files", label: "Files", icon: FileText },
  { key: "people", label: "People & access", icon: Users },
  { key: "actions", label: "Decision", icon: MessageCircleQuestion },
] as const;

// Human labels for the registration wizard's sections and fields.
const SECTION_LABELS: Record<string, string> = {
  organisation: "Organisation",
  schoolType: "School type",
  location: "Location",
  profile: "School profile",
  studentNumbers: "Students",
  staff: "Staff",
  academic: "Academics",
  currentSystems: "Current systems",
  modules: "Modules requested",
};
const humanize = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** One school, for OASIS developers: everything they registered, the files
 * they sent, who can log in, and the approve / reject / suspend controls. */
export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("application");
  const { rows: schools, loading } = useRealtimeRows<Tables<"schools">>("schools");
  const { rows: apps } = useRealtimeRows<Tables<"school_applications">>("school_applications");
  const { rows: allFiles } = useRealtimeRows<Tables<"school_files">>("school_files");
  const { rows: allProfiles } = useRealtimeRows<Tables<"profiles">>("profiles");
  const { rows: allStaff } = useRealtimeRows<Tables<"staff">>("staff", "full_name");

  const school = schools.find((s) => s.id === id);
  const app = apps.find((a) => a.school_id === id);
  const files = allFiles.filter((f) => f.school_id === id);
  const profiles = allProfiles.filter((p) => p.school_id === id);
  const admins = allStaff.filter((s) => s.school_id === id && s.access_role === "school_admin");

  if (loading) return <p className="p-10 text-center text-sm text-slate-400">Loading…</p>;
  if (!school) {
    return (
      <div>
        <PageHeader title="School not found" breadcrumbs={[{ label: "Schools", href: "/portal/schools" }, { label: "Not found" }]} />
        <EmptyState title="We couldn't find that school" description="It may have been deleted." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <SchoolLogo school={school} size={56} />
        <div className="flex-1">
          <PageHeader
            title={school.name}
            description={[school.district, school.school_type, school.contact_email].filter(Boolean).join(" · ")}
            breadcrumbs={[{ label: "Requests", href: "/portal/requests" }, { label: "Schools", href: "/portal/schools" }, { label: school.name }]}
            action={<Badge tone={STATUS_TONE[school.status] ?? "neutral"}>{STATUS_LABEL[school.status] ?? school.status}</Badge>}
          />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
              tab === t.key ? "bg-oasis-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            {t.key === "files" && files.length > 0 && <span className={tab === t.key ? "text-white/80" : "text-slate-400"}>{files.length}</span>}
          </button>
        ))}
      </div>

      {tab === "application" && <ApplicationTab school={school} app={app} />}
      {tab === "files" && <FilesTab files={files} />}
      {tab === "people" && <PeopleTab school={school} profiles={profiles} admins={admins} />}
      {tab === "actions" && <DecisionTab school={school} onDeleted={() => router.push("/portal/requests")} toast={toast} />}
    </div>
  );
}

function ApplicationTab({ school, app }: { school: Tables<"schools">; app?: Tables<"school_applications"> }) {
  const data = (app?.data ?? {}) as Record<string, Record<string, unknown>>;
  const sections = Object.entries(data).filter(([, v]) => v && typeof v === "object");
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Headline details" subtitle={app?.submitted_at ? `Submitted ${new Date(app.submitted_at).toLocaleString("en-GB")}` : "The school hasn't submitted the full form yet."} />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {[
            ["School", school.name],
            ["Code", school.code],
            ["Type", school.school_type],
            ["Students", school.student_band],
            ["District", school.district],
            ["Address", school.address],
            ["Contact", school.contact_name],
            ["Email", school.contact_email],
            ["Phone", school.contact_phone],
            ["Registered", new Date(school.created_at).toLocaleDateString("en-GB")],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold text-slate-400">{k}</dt>
              <dd className="text-slate-800">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        {app?.review_note && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Last note to school:</strong> {app.review_note}
          </p>
        )}
      </Card>
      {sections.map(([key, value]) => (
        <Card key={key}>
          <CardHeader title={SECTION_LABELS[key] ?? humanize(key)} />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {Object.entries(value).map(([field, v]) => (
              <div key={field}>
                <dt className="text-xs font-semibold text-slate-400">{humanize(field)}</dt>
                <dd className="whitespace-pre-wrap text-slate-800">{Array.isArray(v) ? v.join(", ") || "—" : v === "" || v === null || v === undefined ? "—" : String(v)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  );
}

function FilesTab({ files }: { files: Tables<"school_files">[] }) {
  const [opening, setOpening] = useState<string | null>(null);
  const sorted = [...files].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  async function open(path: string) {
    setOpening(path);
    const url = await signedUrl(path, 600);
    setOpening(null);
    if (url) window.open(url, "_blank", "noopener");
  }
  async function setStatus(id: string, status: string) {
    await createClient().from("school_files").update({ status }).eq("id", id);
  }
  return (
    <Card className="p-0">
      {sorted.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={FileText} title="No files yet" description="Documents and data the school uploads during registration appear here." />
        </div>
      ) : (
        sorted.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-0">
            <FileText className="h-5 w-5 text-oasis-500" />
            <div className="min-w-[200px] flex-1">
              <p className="text-sm font-semibold text-slate-800">{f.name}</p>
              <p className="text-xs text-slate-500">
                {f.category === "document" ? `Document · ${humanize(f.note ?? "")}` : "School data"} · {formatBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString("en-GB")}
                {f.category === "data" && f.note ? ` · "${f.note}"` : ""}
              </p>
            </div>
            {f.category === "data" && (
              <select
                value={f.status}
                onChange={(e) => setStatus(f.id, e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                aria-label="Import status"
              >
                <option value="received">Received</option>
                <option value="imported">Imported</option>
                <option value="rejected">Can't use</option>
              </select>
            )}
            <Button size="sm" variant="secondary" onClick={() => open(f.path)} loading={opening === f.path}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
            {(f.category === "data" || /.(xlsx?|xlsm|ods|csv|tsv)$/i.test(f.name)) && (
              <div className="basis-full pl-8">
                <AiFileReader fileId={f.id} compact />
              </div>
            )}
          </div>
        ))
      )}
    </Card>
  );
}

function PeopleTab({ school, profiles, admins }: { school: Tables<"schools">; profiles: Tables<"profiles">[]; admins: Tables<"staff">[] }) {
  const { toast } = useToast();
  const [banned, setBanned] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const ids = useMemo(() => profiles.map((p) => p.id).sort().join(","), [profiles]);

  useEffect(() => {
    if (!ids) return;
    platformAction({ action: "list_access", user_ids: ids.split(",") }).then(({ data }) => setBanned(new Set((data?.banned as string[]) ?? [])));
  }, [ids]);

  async function toggle(p: Tables<"profiles">) {
    const revoke = !banned.has(p.id);
    if (revoke && !window.confirm(`Remove ${p.full_name ?? p.email}'s access to OASIS? They won't be able to sign in until restored.`)) return;
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
    toast("success", revoke ? "Access removed" : "Access restored", p.email ?? "");
  }

  async function addAdmin() {
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast("error", "Enter a name and a valid email", "");
    setAdding(true);
    const { error } = await createClient()
      .from("staff")
      .insert({ school_id: school.id, full_name: name.trim(), email: email.trim().toLowerCase(), access_role: "school_admin", job_title: "Administrator", status: "active" });
    setAdding(false);
    if (error) return toast("error", "Couldn't add administrator", error.message);
    setName("");
    setEmail("");
    toast("success", "Administrator added", `They can now sign up as staff of ${school.name} with ${email.trim()}.`);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <Card className="p-0 lg:col-span-3">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <p className="text-sm font-semibold text-slate-800">Logins at this school</p>
          <p className="text-xs text-slate-500">Remove access instantly - they&rsquo;re signed out and can&rsquo;t sign back in until restored.</p>
        </div>
        {profiles.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">No logins yet.</p>
        ) : (
          profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{p.full_name || "—"}</p>
                <p className="text-xs text-slate-500">
                  {p.email} · {p.role.replace("_", " ")}
                </p>
              </div>
              {banned.has(p.id) && <Badge tone="danger">Access removed</Badge>}
              <Button size="sm" variant={banned.has(p.id) ? "secondary" : "danger"} onClick={() => toggle(p)} loading={busy === p.id}>
                {banned.has(p.id) ? "Restore" : <><ShieldOff className="h-3.5 w-3.5" /> Remove access</>}
              </Button>
            </div>
          ))
        )}
      </Card>

      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader title="Add an administrator" subtitle="Head teacher, ICT or data manager. They sign up as staff with this email and get full admin access to this school." />
          <div className="space-y-3">
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={addAdmin} loading={adding} className="w-full">
              <UserPlus className="h-4 w-4" /> Add administrator
            </Button>
          </div>
        </Card>
        <Card className="p-0">
          <div className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-800">Administrators on file</div>
          {admins.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-400">None added yet.</p>
          ) : (
            admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm last:border-0">
                <span>
                  <span className="font-semibold text-slate-800">{a.full_name}</span>
                  <span className="block text-xs text-slate-500">{a.email}</span>
                </span>
                <Badge tone={a.profile_id ? "success" : "warning"}>{a.profile_id ? "Signed up" : "Invited"}</Badge>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function DecisionTab({ school, onDeleted, toast }: { school: Tables<"schools">; onDeleted: () => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  async function setStatus(status: string, needsNote = false) {
    if (needsNote && !note.trim()) return toast("error", "Add a note for the school", "Tell them what's missing or why.");
    setBusy(status);
    const { error } = await platformAction({ action: "set_school_status", school_id: school.id, status, note: note.trim() });
    setBusy(null);
    if (error) return toast("error", "Couldn't update the school", error);
    setNote("");
    toast("success", `${school.name}: ${STATUS_LABEL[status] ?? status}`, "The school has been emailed.");
  }

  async function remove() {
    setBusy("delete");
    const { error } = await platformAction({ action: "delete_school", school_id: school.id, confirm_name: confirmName });
    setBusy(null);
    if (error) return toast("error", "Couldn't delete", error);
    setConfirmOpen(false);
    toast("success", "School deleted", school.name);
    onDeleted();
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Review" subtitle="Every decision emails the school's contact and administrators." />
        <textarea
          className="mb-3 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-oasis-400 focus:ring-4 focus:ring-oasis-100"
          rows={4}
          placeholder="Note to the school (required for 'Ask for more info' and 'Reject')"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setStatus("approved")} loading={busy === "approved"} disabled={school.status === "approved"}>
            <CheckCircle2 className="h-4 w-4" /> Approve
          </Button>
          <Button variant="secondary" onClick={() => setStatus("more_info_requested", true)} loading={busy === "more_info_requested"}>
            <MessageCircleQuestion className="h-4 w-4" /> Ask for more info
          </Button>
          <Button variant="danger" onClick={() => setStatus("rejected", true)} loading={busy === "rejected"}>
            <XCircle className="h-4 w-4" /> Reject
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Access" subtitle="Suspending blocks the whole school's dashboard but keeps its data." />
        <div className="flex flex-wrap gap-2">
          {school.status === "suspended" ? (
            <Button onClick={() => setStatus("approved")} loading={busy === "approved"}>
              Restore school
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setStatus("suspended")} loading={busy === "suspended"}>
              <ShieldOff className="h-4 w-4" /> Suspend school
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete school
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Deleting is only possible for schools with no logins or students yet (e.g. spam or duplicate registrations).</p>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Delete ${school.name}?`}
        description="This permanently removes the school, its application and its uploaded files. Type the school's exact name to confirm."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} disabled={confirmName.trim() !== school.name || busy === "delete"}>
              {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete permanently
            </Button>
          </div>
        }
      >
        <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={school.name} />
      </Modal>
    </div>
  );
}
