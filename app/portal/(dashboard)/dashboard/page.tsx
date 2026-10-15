"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Server,
  HardDrive,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card, CardHeader } from "@/components/portal/ui/Card";
import { StatCard } from "@/components/portal/ui/StatCard";
import { EmptyState } from "@/components/portal/ui/EmptyState";
import { useCollection } from "@/lib/store";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { schoolRowToRequest } from "@/lib/supabase/school-mapper";
import type { Tables } from "@/types/database.types";
import type { PlatformEvent } from "@/types/portal";

export default function DashboardPage() {
  const { rows } = useRealtimeRows<Tables<"schools">>("schools");
  const schools = useMemo(() => rows.map(schoolRowToRequest), [rows]);
  const [events] = useCollection<PlatformEvent>("oasis_platform_events");

  const approved = schools.filter((r) => r.status === "approved");
  const active = approved.filter((r) => r.subscriptionStatus === "active");
  const trial = approved.filter((r) => r.subscriptionStatus === "trial");
  const expiring = approved.filter((r) => r.subscriptionStatus === "expiring");
  const totalStorageUsed = approved.reduce((s, r) => s + r.storageUsedMb, 0);
  const totalStorageLimit = approved.reduce((s, r) => s + r.storageLimitMb, 0);
  const storagePct = totalStorageLimit ? Math.round((totalStorageUsed / totalStorageLimit) * 100) : 0;

  // Registrations waiting on a developer (directory listings and the demo school aren't registrations).
  const awaitingReview = rows.filter((s) => s.status === "pending_review" && !s.code?.startsWith("DIR-") && s.code !== "OASIS-DEMO").length;

  return (
    <div>
      {awaitingReview > 0 && (
        <Link
          href="/portal/requests"
          className="mb-5 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 transition hover:bg-amber-100"
        >
          <span>
            <strong>{awaitingReview} school registration{awaitingReview === 1 ? "" : "s"}</strong> waiting for review
          </span>
          <span className="inline-flex items-center gap-1 font-semibold">
            Review now <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}
      <PageHeader
        title="Dashboard"
        description="Platform health and business overview."
        action={
          <Link
            href="/portal/schools"
            className="inline-flex items-center gap-1.5 rounded-xl bg-oasis-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-oasis-600 hover:-translate-y-0.5 active:translate-y-0"
          >
            Manage schools <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total Schools" value={String(schools.length)} icon={Building2} accent="oasis" />
        <StatCard label="Active Schools" value={String(active.length)} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Trial Schools" value={String(trial.length)} icon={Sparkles} accent="sky" />
        <StatCard label="Expiring Subscriptions" value={String(expiring.length)} icon={AlertTriangle} accent="amber" />
        <StatCard label="Platform Uptime" value="—" icon={Server} accent="emerald" trendLabel="Requires monitoring integration" />
        <StatCard label="API Status" value="—" icon={Activity} accent="emerald" trendLabel="Requires monitoring integration" />
        <StatCard label="Storage Usage" value={totalStorageLimit ? `${storagePct}%` : "—"} icon={HardDrive} accent="sky" trendLabel={totalStorageLimit ? `${(totalStorageUsed / 1024).toFixed(1)} GB of ${(totalStorageLimit / 1024).toFixed(1)} GB` : "No approved schools yet"} />
        <StatCard label="New Schools This Month" value={String(schools.filter((r) => r.createdAt >= new Date().toISOString().slice(0, 7)).length)} icon={Building2} accent="oasis" />
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title="Recent platform events" subtitle="School lifecycle, billing and system activity" />
          {events.length === 0 ? (
            <EmptyState title="No activity yet" description="Approve a school, trigger a backup, or send a notification and it will show up here." />
          ) : (
            <ul className="divide-y divide-slate-50">
              {events.slice(0, 10).map((item) => (
                <li key={item.id} className="animate-fade-up flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-oasis-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">{item.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.actor} &middot; {item.timestamp}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {schools.length === 0 && (
        <Card className="mt-5 border-dashed bg-slate-50/60">
          <EmptyState
            title="No schools registered yet"
            description="Schools appear here automatically once they complete registration at /register."
            action={
              <Link href="/portal/schools" className="text-sm font-semibold text-oasis-600 hover:text-oasis-700">
                Go to Schools →
              </Link>
            }
          />
        </Card>
      )}
    </div>
  );
}
