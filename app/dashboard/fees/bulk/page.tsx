"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/ui/Card";
import { Button } from "@/components/portal/ui/Button";
import { Input, Select } from "@/components/portal/ui/Input";
import { Field } from "@/components/school/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import { friendlyDbError } from "@/lib/db-errors";
import type { Tables } from "@/types/database.types";

/** One invoice for every active student in a class (same as the mobile
 * app's). Students who already have an invoice with the same description
 * are skipped, so it's safe to run twice. */
export default function BulkInvoicePage() {
  const router = useRouter();
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const { rows: classes } = useRealtimeRows<Tables<"classes">>("classes", "name");
  const { rows: categories } = useRealtimeRows<Tables<"fee_categories">>("fee_categories", "name");
  const { rows: students } = useRealtimeRows<Tables<"students">>("students", "full_name");
  const { rows: invoices } = useRealtimeRows<Tables<"fee_invoices">>("fee_invoices");
  const [classId, setClassId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const canWrite = role === "school_admin" || role === "teacher" || role === "bursar";

  const sortedClasses = useMemo(() => [...classes].sort((a, b) => a.name.localeCompare(b.name)), [classes]);
  const inClass = students.filter((s) => s.class_id === classId && s.status === "active");
  const billed = new Set(invoices.filter((i) => i.description === description.trim()).map((i) => i.student_id));
  const toBill = inClass.filter((s) => !billed.has(s.id));
  const amountNum = Number(amount);
  const total = toBill.length * (amountNum > 0 ? amountNum : 0);

  useEffect(() => {
    const c = categories.find((x) => x.id === categoryId);
    if (!c) return;
    setDescription(c.name);
    setAmount(String(c.amount));
    if (c.class_id) setClassId(c.class_id);
  }, [categoryId, categories]);

  async function save() {
    if (!profile?.school_id) return;
    if (!classId || !description.trim() || !(amountNum > 0)) {
      toast("error", "Missing details", "Choose a class and enter a description and an amount.");
      return;
    }
    if (!toBill.length) {
      toast("info", "Nothing to do", "Everyone in this class already has this invoice.");
      return;
    }
    setSaving(true);
    const { error } = await createClient()
      .from("fee_invoices")
      .insert(toBill.map((s) => ({ school_id: profile.school_id!, student_id: s.id, description: description.trim(), amount: amountNum, due_date: dueDate || null, status: "unpaid" })));
    setSaving(false);
    if (error) return toast("error", "Couldn't create invoices", friendlyDbError(error.message));
    toast("success", `${toBill.length} invoices created`, `UGX ${total.toLocaleString()} billed.`);
    router.push("/dashboard/fees");
  }

  return (
    <div>
      <PageHeader
        title="Invoice a class"
        description="Create the same invoice for every active student in a class."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Fees & Payments", href: "/dashboard/fees" }, { label: "Invoice a class" }]}
      />
      {!canWrite ? (
        <Card>
          <p className="py-8 text-center text-sm text-slate-500">Your role can&rsquo;t create invoices.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Class *">
                <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">Select class…</option>
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fee category (fills in the rest)">
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Optional…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {Number(c.amount).toLocaleString()}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Description *">
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Term 3 Tuition" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount (UGX) *">
                  <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="850000" />
                </Field>
                <Field label="Due date">
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>
          <Card className="flex flex-col justify-between gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500">Students to invoice</p>
                <p className="text-3xl font-bold tracking-tight text-slate-900">{classId ? toBill.length : "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Total billed</p>
                <p className="text-xl font-bold tracking-tight text-emerald-600">UGX {total.toLocaleString()}</p>
              </div>
            </div>
            {classId && inClass.length > toBill.length && (
              <p className="text-xs text-slate-500">
                {inClass.length - toBill.length} already {inClass.length - toBill.length === 1 ? "has" : "have"} &ldquo;{description.trim()}&rdquo; and will be skipped.
              </p>
            )}
            <Button onClick={save} loading={saving} disabled={!classId || !toBill.length || !(amountNum > 0) || !description.trim()}>
              <Layers className="h-4 w-4" /> Create {toBill.length || ""} invoice{toBill.length === 1 ? "" : "s"}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
