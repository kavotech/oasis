"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, KeyRound, Lock } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card, CardHeader } from "@/components/portal/ui/Card";
import { Badge } from "@/components/portal/ui/Badge";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const PROJECT_REF = SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "";

const FUNCTIONS = [
  ["send-otp", "Emails sign-up / password-reset codes"],
  ["create-account", "Creates logins (schools, staff, parents, developers) after the email code"],
  ["reset-password-otp", "Resets a password with an emailed code"],
  ["registration-received", "Confirms a school's registration and alerts developers"],
  ["platform-admin", "Developer console actions: approve, suspend, delete, access"],
  ["admin-create-user", "Provision a login directly (super admin)"],
  ["send-email", "Resend email delivery"],
];

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-400">{label}</p>
        <p className="truncate font-mono text-sm text-slate-800">{secret ? `${value.slice(0, 18)}…` : value || "—"}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Keys and plumbing for OASIS developers. Only public values are shown -
 * the service-role key and Resend key live in Supabase / Vercel secrets. */
export default function DeveloperToolsPage() {
  const dash = PROJECT_REF ? `https://supabase.com/dashboard/project/${PROJECT_REF}` : "https://supabase.com/dashboard";
  return (
    <div>
      <PageHeader
        title="Keys & developer tools"
        description="Connection details for the website, mobile app and integrations."
        breadcrumbs={[{ label: "Dashboard", href: "/portal/dashboard" }, { label: "Developer tools" }]}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Public keys" subtitle="Safe in apps and websites - access is enforced by row-level security." action={<KeyRound className="h-5 w-5 text-oasis-500" />} />
          <CopyRow label="Supabase URL (EXPO_PUBLIC_ / NEXT_PUBLIC_SUPABASE_URL)" value={SUPABASE_URL} />
          <CopyRow label="Publishable key (EXPO_PUBLIC_ / NEXT_PUBLIC_SUPABASE_ANON_KEY)" value={PUBLISHABLE_KEY} />
          <CopyRow label="Project ref" value={PROJECT_REF} />
        </Card>
        <Card>
          <CardHeader title="Secret keys" subtitle="Never shown in the browser." action={<Lock className="h-5 w-5 text-slate-400" />} />
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <strong>Service role key</strong> - Supabase → Project Settings → API Keys. Used only by Edge Functions and{" "}
              <code className="rounded bg-slate-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> on Vercel.
            </li>
            <li>
              <strong>Resend API key</strong> - Supabase → Edge Functions → Secrets (<code className="rounded bg-slate-100 px-1">RESEND_API_KEY</code>).
            </li>
            <li>
              <strong>Database password</strong> - Supabase → Project Settings → Database. Rotate it if it&rsquo;s ever shared.
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`${dash}/settings/api-keys`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              API keys <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a href={`${dash}/functions`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Edge Functions <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a href={`${dash}/logs/explorer`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Logs <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Edge Functions" subtitle="Server-side code that holds the secret keys." />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FUNCTIONS.map(([name, desc]) => (
              <div key={name} className="rounded-xl border border-slate-100 px-4 py-3">
                <p className="flex items-center gap-2 font-mono text-sm font-semibold text-slate-800">
                  {name} <Badge tone="success">live</Badge>
                </p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
