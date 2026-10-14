"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CalendarPlus,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Layers,
  Send,
  ThumbsUp,
  TriangleAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { Card } from "@/components/portal/ui/Card";
import { Badge } from "@/components/portal/ui/Badge";
import { Avatar } from "@/components/portal/ui/Avatar";
import { StatCard } from "@/components/portal/ui/StatCard";
import { EmptyState } from "@/components/portal/ui/EmptyState";
import { OnboardingChecklist } from "@/components/school/OnboardingChecklist";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { schoolNav } from "@/lib/school-nav";
import type { Tables } from "@/types/database.types";

// Same quick actions as the mobile app's round + menu; ?add=1 opens the
// module's Add drawer straight away.
const QUICK_ACTIONS: { label: string; href: string; icon: LucideIcon; tone: string }[] = [
  { label: "Take register", href: "/dashboard/attendance/register", icon: ClipboardCheck, tone: "bg-emerald-50 text-emerald-600" },
  { label: "Add student", href: "/dashboard/students?add=1", icon: UserPlus, tone: "bg-oasis-50 text-oasis-600" },
  { label: "Bulk add students", href: "/dashboard/students/bulk", icon: Users, tone: "bg-indigo-50 text-indigo-600" },
  { label: "New invoice", href: "/dashboard/fees?add=1", icon: CreditCard, tone: "bg-amber-50 text-amber-600" },
  { label: "Invoice a class", href: "/dashboard/fees/bulk", icon: Layers, tone: "bg-orange-50 text-orange-600" },
  { label: "Send message", href: "/dashboard/communication?add=1", icon: Send, tone: "bg-sky-50 text-sky-600" },
  { label: "Add event", href: "/dashboard/calendar?add=1", icon: CalendarPlus, tone: "bg-pink-50 text-pink-600" },
  { label: "Log behaviour", href: "/dashboard/behaviour?add=1", icon: Award, tone: "bg-violet-50 text-violet-600" },
];

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const ugx = (n: number) => `UGX ${n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : n}`;

export default function DashboardPage() {
  const { user, profile, role } = useAuth();
  const linked = !!profile?.school_id;
  const staffView = role !== "parent" && role !== "student";

  const { rows: schools } = useRealtimeRows<Tables<"schools">>("schools");
  const { rows: students } = useRealtimeRows<Tables<"students">>("students", "full_name");
  const { rows: staff } = useRealtimeRows<Tables<"staff">>("staff");
  const { rows: classes } = useRealtimeRows<Tables<"classes">>("classes");
  const { rows: attendance } = useRealtimeRows<Tables<"attendance_records">>("attendance_records", "date");
  const { rows: invoices } = useRealtimeRows<Tables<"fee_invoices">>("fee_invoices");
  const { rows: events } = useRealtimeRows<Tables<"calendar_events">>("calendar_events", "event_date");
  const { rows: behaviour } = useRealtimeRows<Tables<"behaviour_incidents">>("behaviour_incidents");

  const school = schools.find((s) => s.id === profile?.school_id);
  const name = profile?.full_name || user?.email || "";
  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.full_name])), [students]);

  const today = localToday();
  const t = { present: 0, late: 0, excused: 0, absent: 0 };
  for (const a of attendance) if (a.date === today && a.status in t) t[a.status as keyof typeof t]++;
  const marked = t.present + t.late + t.excused + t.absent;
  const inSchool = marked ? Math.round(((t.present + t.late) / marked) * 100) : 0;

  let collected = 0;
  let outstanding = 0;
  let overdue = 0;
  for (const i of invoices) {
    if (i.status === "paid") collected += Number(i.amount);
    else outstanding += Number(i.amount);
    if (i.status === "overdue") overdue++;
  }
  const billed = collected + outstanding;
  const collectedPct = billed ? Math.round((collected / billed) * 100) : 0;

  const upcoming = events
    .filter((e) => e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 4);
  const recentBehaviour = [...behaviour].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4);

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name || "?"} size={52} />
          <div>
            <p className="text-sm text-slate-500">{greeting()}</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{name.split(" ")[0] || name}</h1>
            <p className="text-sm text-slate-500">{[school?.name, role ? ROLE_LABELS[role] : null].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      </div>

      {!linked ? (
        <Card className="border-dashed bg-slate-50/60">
          <EmptyState
            icon={Building2}
            title="Not linked to a school yet"
            description="Your account isn't attached to a school, so the modules below won't show any data until that's set up."
          />
        </Card>
      ) : (
        <>
          {staffView && (
            <div className="flex gap-5 overflow-x-auto pb-1">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.label} href={a.href} className="group flex w-20 flex-shrink-0 flex-col items-center gap-2 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/70 shadow-card backdrop-blur transition group-hover:-translate-y-0.5 group-hover:shadow-card-hover">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full ${a.tone}`}>
                      <a.icon className="h-5 w-5" />
                    </span>
                  </span>
                  <span className="text-xs font-semibold leading-tight text-slate-700">{a.label}</span>
                </Link>
              ))}
            </div>
          )}

          {role === "school_admin" && <OnboardingChecklist />}

          {staffView && (
            <>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Today */}
                <Section title="Today" href="/dashboard/attendance" action="Attendance">
                  <Card className="h-full">
                    <div className="flex items-center gap-6">
                      <Ring
                        label={marked ? `${inSchool}%` : "—"}
                        sub={marked ? "in school" : "not marked"}
                        segments={[
                          { value: t.present, color: "#10b981" },
                          { value: t.late, color: "#f59e0b" },
                          { value: t.excused, color: "#9498ef" },
                          { value: t.absent, color: "#f43f5e" },
                        ]}
                      />
                      <div className="flex-1 space-y-2 text-sm">
                        <Legend color="bg-emerald-500" label="Present" value={t.present} />
                        <Legend color="bg-amber-500" label="Late" value={t.late} />
                        <Legend color="bg-oasis-500" label="Excused" value={t.excused} />
                        <Legend color="bg-rose-500" label="Absent" value={t.absent} />
                      </div>
                    </div>
                    {marked < students.length && (
                      <Link
                        href="/dashboard/attendance/register"
                        className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        {marked ? `${students.length - marked} still to mark` : "Take today's attendance"}
                      </Link>
                    )}
                  </Card>
                </Section>

                {/* Overview */}
                <Section title="Overview" href="/dashboard/reporting" action="Reports" className="lg:col-span-2">
                  <div className="grid h-full grid-cols-2 gap-4 xl:grid-cols-4">
                    <StatCard label="Students" value={students.length.toLocaleString()} icon={Users} accent="oasis" />
                    <StatCard label="Staff" value={staff.length.toLocaleString()} icon={Briefcase} accent="sky" />
                    <StatCard label="Classes" value={classes.length.toLocaleString()} icon={BookOpen} accent="emerald" />
                    <StatCard label="Overdue invoices" value={overdue.toLocaleString()} icon={AlertCircle} accent="amber" />
                  </div>
                </Section>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Fees */}
                <Section title="Fees" href="/dashboard/fees" action="Invoices">
                  <Card className="h-full">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Collected</p>
                        <p className="text-xl font-bold tracking-tight text-emerald-600">{ugx(collected)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-500">Outstanding</p>
                        <p className="text-xl font-bold tracking-tight text-amber-700">{ugx(outstanding)}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-amber-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${collectedPct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{billed ? `${collectedPct}% of billed fees collected` : "No invoices yet"}</p>
                  </Card>
                </Section>

                {/* Coming up */}
                <Section title="Coming up" href="/dashboard/calendar" action="Calendar">
                  <Card className="h-full p-0">
                    {upcoming.length === 0 ? (
                      <p className="p-6 text-center text-sm text-slate-400">Nothing scheduled.</p>
                    ) : (
                      upcoming.map((e) => {
                        const d = new Date(`${e.event_date}T00:00:00`);
                        return (
                          <div key={e.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-0">
                            <span className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-full bg-oasis-50 leading-none">
                              <span className="text-sm font-bold text-oasis-700">{d.getDate()}</span>
                              <span className="text-[9px] font-bold uppercase text-oasis-600">{d.toLocaleDateString("en-GB", { month: "short" })}</span>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">{e.title}</p>
                              <p className="text-xs text-slate-500">{d.toLocaleDateString("en-GB", { weekday: "long" })}</p>
                            </div>
                            {e.event_type && <Badge tone="info">{e.event_type}</Badge>}
                          </div>
                        );
                      })
                    )}
                  </Card>
                </Section>

                {/* Behaviour */}
                <Section title="Recent behaviour" href="/dashboard/behaviour" action="All">
                  <Card className="h-full p-0">
                    {recentBehaviour.length === 0 ? (
                      <p className="p-6 text-center text-sm text-slate-400">No incidents logged.</p>
                    ) : (
                      recentBehaviour.map((b) => (
                        <div key={b.id} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-0">
                          <span
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                              b.type === "positive" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            {b.type === "positive" ? <ThumbsUp className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">{studentName.get(b.student_id) ?? "Student"}</p>
                            <p className="truncate text-xs text-slate-500">{b.description}</p>
                          </div>
                          {b.points != null && (
                            <span className={`text-sm font-bold ${b.points >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{b.points > 0 ? `+${b.points}` : b.points}</span>
                          )}
                        </div>
                      ))
                    )}
                  </Card>
                </Section>
              </div>
            </>
          )}
        </>
      )}

      {/* All modules */}
      <Section title="All modules">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {schoolNav
            .filter((item) => item.href !== "/dashboard")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-oasis-50 text-oasis-600 transition group-hover:bg-oasis-100">
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              </Link>
            ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, href, action, className, children }: { title: string; href?: string; action?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
        {href && action && (
          <Link href={href} className="flex items-center gap-0.5 text-sm font-semibold text-oasis-600 hover:text-oasis-700">
            {action} <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="flex-1 text-slate-600">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  );
}

/** Activity-style ring, same as the mobile app's AttendanceRing. */
function Ring({ segments, label, sub, size = 128, stroke = 14 }: { segments: { value: number; color: string }[]; label: string; sub: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,152,239,0.15)" strokeWidth={stroke} />
        {total > 0 &&
          segments.map((seg, i) => {
            if (!seg.value) return null;
            const len = (seg.value / total) * c;
            const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tracking-tight text-slate-900">{label}</span>
        <span className="text-[11px] font-semibold text-slate-500">{sub}</span>
      </div>
    </div>
  );
}
