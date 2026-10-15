"use client";

import { useState } from "react";
import { ShieldOff, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card, CardHeader } from "@/components/portal/ui/Card";
import { Badge } from "@/components/portal/ui/Badge";
import { Button } from "@/components/portal/ui/Button";
import { Input } from "@/components/portal/ui/Input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { platformAction } from "@/lib/platform";
import type { Tables } from "@/types/database.types";

/** The OASIS team. Only emails listed here can create a developer login
 * (via "Join as an OASIS developer" on the sign-in page). */
export default function DevelopersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { rows } = useRealtimeRows<Tables<"platform_developers">>("platform_developers");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function add() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return toast("error", "Enter a valid email", "");
    setSaving(true);
    const { error } = await createClient().from("platform_developers").insert({ email: e, full_name: name.trim() || null, invited_by: user?.id ?? null });
    setSaving(false);
    if (error) return toast("error", "Couldn't add developer", error.message.includes("duplicate") ? "That email is already on the list." : error.message);
    setEmail("");
    setName("");
    toast("success", "Developer added", `${e} can now create their developer login from the sign-in page.`);
  }

  async function toggle(d: Tables<"platform_developers">) {
    const revoke = !d.revoked_at;
    if (revoke && !window.confirm(`Remove ${d.email}'s developer access?`)) return;
    setBusy(d.id);
    if (d.profile_id) {
      const { error } = await platformAction({ action: "set_user_access", user_id: d.profile_id, revoked: revoke });
      if (error) {
        setBusy(null);
        return toast("error", "Couldn't change access", error);
      }
    } else {
      await createClient().from("platform_developers").update({ revoked_at: revoke ? new Date().toISOString() : null }).eq("id", d.id);
    }
    setBusy(null);
    toast("success", revoke ? "Access removed" : "Access restored", d.email);
  }

  const sorted = [...rows].sort((a, b) => Number(!!a.revoked_at) - Number(!!b.revoked_at) || a.email.localeCompare(b.email));

  return (
    <div>
      <PageHeader
        title="OASIS developers"
        description="Developers run the platform: they review school registrations, add and remove schools and administrators, and manage access."
        breadcrumbs={[{ label: "Dashboard", href: "/portal/dashboard" }, { label: "Developers" }]}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-0 lg:col-span-2">
          {sorted.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{d.full_name || d.email}</p>
                <p className="text-xs text-slate-500">
                  {d.email} · added {new Date(d.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
              {d.revoked_at ? <Badge tone="danger">Access removed</Badge> : d.profile_id ? <Badge tone="success">Active</Badge> : <Badge tone="warning">Hasn&rsquo;t signed up</Badge>}
              {d.profile_id !== user?.id && (
                <Button size="sm" variant={d.revoked_at ? "secondary" : "danger"} onClick={() => toggle(d)} loading={busy === d.id}>
                  {d.revoked_at ? "Restore" : <><ShieldOff className="h-3.5 w-3.5" /> Remove</>}
                </Button>
              )}
            </div>
          ))}
        </Card>
        <Card>
          <CardHeader title="Add a developer" subtitle="They'll sign up at /login → 'Join as an OASIS developer' with this email." />
          <div className="space-y-3">
            <Input placeholder="Full name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={add} loading={saving} className="w-full">
              <UserPlus className="h-4 w-4" /> Add developer
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
