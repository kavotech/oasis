"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, FileText, Inbox } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/ui/Card";
import { Badge } from "@/components/portal/ui/Badge";
import { EmptyState } from "@/components/portal/ui/EmptyState";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/platform";
import { cn } from "@/lib/utils/cn";
import type { Tables } from "@/types/database.types";

const TABS = [
  { key: "open", label: "Needs review", statuses: ["pending_review"] },
  { key: "info", label: "Waiting on school", statuses: ["more_info_requested"] },
  { key: "closed", label: "Decided", statuses: ["approved", "rejected", "suspended"] },
] as const;

/** Onboarding inbox: every school registration, newest first. */
export default function RequestsPage() {
  const { rows: schools, loading } = useRealtimeRows<Tables<"schools">>("schools");
  const { rows: apps } = useRealtimeRows<Tables<"school_applications">>("school_applications");
  const { rows: files } = useRealtimeRows<Tables<"school_files">>("school_files");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");

  const appBySchool = useMemo(() => new Map(apps.map((a) => [a.school_id, a])), [apps]);
  const filesBySchool = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of files) m.set(f.school_id, (m.get(f.school_id) ?? 0) + 1);
    return m;
  }, [files]);

  // Directory listings (DIR-*) and the demo school aren't registrations.
  const registrations = schools.filter((s) => !s.code?.startsWith("DIR-") && s.code !== "OASIS-DEMO");
  const current = TABS.find((t) => t.key === tab)!;
  const list = registrations
    .filter((s) => (current.statuses as readonly string[]).includes(s.status))
    .sort((a, b) => (appBySchool.get(b.id)?.submitted_at ?? b.created_at).localeCompare(appBySchool.get(a.id)?.submitted_at ?? a.created_at));

  return (
    <div>
      <PageHeader
        title="Onboarding requests"
        description="Schools that have registered with OASIS. Open one to read the full application, download their documents and data, and approve it."
        breadcrumbs={[{ label: "Dashboard", href: "/portal/dashboard" }, { label: "Requests" }]}
      />

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => {
          const n = registrations.filter((s) => (t.statuses as readonly string[]).includes(s.status)).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                tab === t.key ? "bg-oasis-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              {t.label} <span className={tab === t.key ? "text-white/80" : "text-slate-400"}>{n}</span>
            </button>
          );
        })}
      </div>

      <Card className="p-0">
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-400">Loading…</p>
        ) : list.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Inbox} title="Nothing here" description={tab === "open" ? "No registrations are waiting for review." : "No schools in this state."} />
          </div>
        ) : (
          list.map((s) => {
            const app = appBySchool.get(s.id);
            const data = (app?.data ?? {}) as Record<string, Record<string, string>>;
            const fileCount = filesBySchool.get(s.id) ?? 0;
            return (
              <Link key={s.id} href={`/portal/schools/${s.id}`} className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 transition last:border-0 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{STATUS_LABEL[s.status] ?? s.status}</Badge>
                    {!app?.submitted_at && <Badge tone="neutral">Form not finished</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {[s.district ?? data.location?.district, s.school_type ?? data.schoolType?.schoolType, s.student_band ? `${s.student_band.replace(/_/g, "–")} students` : null, s.contact_name, s.contact_email]
                      .filter(Boolean)
                      .join(" · ") || "No details yet"}
                  </p>
                </div>
                <div className="hidden text-right text-xs text-slate-500 sm:block">
                  <p>{new Date(app?.submitted_at ?? s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  {fileCount > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 text-oasis-600">
                      <FileText className="h-3 w-3" /> {fileCount} file{fileCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            );
          })
        )}
      </Card>
    </div>
  );
}
