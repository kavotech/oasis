"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/ui/Card";
import { Table, type Column } from "@/components/portal/ui/Table";
import { Button } from "@/components/portal/ui/Button";
import { Drawer } from "@/components/portal/ui/Drawer";
import { Input } from "@/components/portal/ui/Input";
import { Field, textareaClassName } from "@/components/school/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import type { Database } from "@/types/database.types";

type TableName = keyof Database["public"]["Tables"] & string;
type Row = { id: string; school_id?: string; [key: string]: unknown };

type FieldBase = {
  key: string;
  label: string;
  required?: boolean;
  /** Only shown when editing an existing row (e.g. approving a request). */
  editOnly?: boolean;
  /** Restrict who sees/sets this field; defaults to everyone with write access. */
  roles?: string[];
};

export type FieldDef = FieldBase &
  (
    | { type: "text" | "email" | "date" | "number" | "time"; placeholder?: string }
    | { type: "textarea" }
    | { type: "select"; options: { value: string; label: string }[] }
    | { type: "boolean-select"; trueLabel: string; falseLabel: string }
    | { type: "relation"; relationTable: TableName; labelKey: string }
  );

type RelationFieldDef = Extract<FieldDef, { type: "relation" }>;
type Lookup = Map<string, string>;

const OPTIONAL_SUFFIX = /\s*\(optional\)$/i;

/** id -> label maps for every relation field, so tables can show "Jane Doe"
 * instead of a uuid and the form dropdowns share one fetch per table. Kept
 * fresh on focus/network-return like useRealtimeRows, and on demand after a
 * save. */
function useLookups(relations: RelationFieldDef[]) {
  const signature = Array.from(new Set(relations.map((r) => `${r.relationTable}.${r.labelKey}`))).join("|");
  const [lookups, setLookups] = useState<Record<string, Lookup>>({});

  const load = useCallback(async () => {
    if (!signature) return;
    const supabase = createClient();
    const results = await Promise.all(
      signature.split("|").map(async (pair) => {
        const [table, labelKey] = pair.split(".");
        const { data } = await supabase.from(table as TableName).select(`id, ${labelKey}`);
        const entries = ((data ?? []) as unknown as Record<string, unknown>[]).map(
          (r) => [String(r.id), String(r[labelKey] ?? r.id)] as [string, string]
        );
        entries.sort((a, b) => a[1].localeCompare(b[1]));
        return [pair, new Map(entries)] as const;
      })
    );
    setLookups(Object.fromEntries(results));
  }, [signature]);

  useEffect(() => {
    load();
    const onWake = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    return () => {
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [load]);

  return { lookups, reloadLookups: load };
}

function lookupFor(lookups: Record<string, Lookup>, f: RelationFieldDef): Lookup {
  return lookups[`${f.relationTable}.${f.labelKey}`] ?? new Map();
}

function toFormValue(v: unknown, f: FieldDef): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (f.type === "date") return String(v).slice(0, 10);
  if (f.type === "time") return String(v).slice(0, 5);
  return String(v);
}

export function SimpleModule<T extends Row>({
  table,
  title,
  description,
  breadcrumbLabel,
  orderBy,
  fields,
  columns,
  writeRoles,
  deleteRoles = ["school_admin"],
  readRoles,
  extraOnInsert,
  compact,
}: {
  table: TableName;
  title: string;
  description: string;
  breadcrumbLabel?: string;
  orderBy?: string;
  fields: FieldDef[];
  columns: Column<T>[];
  writeRoles: string[];
  deleteRoles?: string[];
  readRoles?: string[];
  extraOnInsert?: Record<string, unknown>;
  /** Skip the full PageHeader (breadcrumbs) - for stacking a second table
   * lower on a page that already has its own PageHeader. */
  compact?: boolean;
}) {
  const { profile, role } = useAuth();
  const { toast } = useToast();

  const hasReadAccess = !readRoles || (role ? readRoles.includes(role) : false);
  const { rows, loading, error: loadError, refetch } = useRealtimeRows<T>(table, orderBy);
  const canWrite = role ? writeRoles.includes(role) : false;
  const canDelete = role ? deleteRoles.includes(role) : false;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const relationFields = useMemo(() => fields.filter((f): f is RelationFieldDef => f.type === "relation"), [fields]);
  const { lookups, reloadLookups } = useLookups(relationFields);

  const visibleFields = fields.filter((f) => (!f.editOnly || editing) && (!f.roles || (role ? f.roles.includes(role) : false)));

  // Relation fields the page doesn't already render get an automatic column,
  // e.g. the student's name on Medical/Attendance rows.
  const shownKeys = new Set(columns.map((c) => c.key));
  const shownHeaders = new Set(columns.map((c) => c.header.toLowerCase()));
  const relationColumns: Column<T>[] = relationFields
    .filter((f) => !shownKeys.has(f.key) && !shownHeaders.has(f.label.replace(OPTIONAL_SUFFIX, "").toLowerCase()))
    .map((f) => ({
      key: f.key,
      header: f.label.replace(OPTIONAL_SUFFIX, ""),
      render: (r: T) => {
        const id = r[f.key] as string | null | undefined;
        return id ? lookupFor(lookups, f).get(id) ?? "—" : "—";
      },
    }));

  function openCreate() {
    setEditing(null);
    setValues({});
    setOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    setValues(Object.fromEntries(fields.map((f) => [f.key, toFormValue(row[f.key], f)])));
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile?.school_id) {
      toast("error", "Couldn't save", "Your account isn't linked to a school.");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = editing ? {} : { school_id: profile.school_id, ...extraOnInsert };
    for (const f of visibleFields) {
      const raw = values[f.key];
      if (raw === undefined || raw === "") {
        // Leave blanks out of inserts so column defaults (e.g. status
        // 'unpaid') apply; on edit, a cleared field really means null.
        if (editing) payload[f.key] = null;
      } else if (f.type === "number") {
        payload[f.key] = Number(raw);
      } else if (f.type === "boolean-select") {
        payload[f.key] = raw === "true";
      } else {
        payload[f.key] = raw;
      }
    }
    const supabase = createClient();
    const { error } = editing
      ? await supabase.from(table).update(payload as never).eq("id", editing.id)
      : await supabase.from(table).insert(payload as never);
    setSaving(false);
    if (error) {
      toast("error", "Couldn't save", error.message);
      return;
    }
    const wasEditing = !!editing;
    setOpen(false);
    setEditing(null);
    setValues({});
    toast("success", wasEditing ? "Updated" : "Saved", "");
    // Realtime normally delivers this, but refetch so the list is right even
    // if the table isn't in the realtime publication.
    refetch();
    reloadLookups();
  }

  async function handleDelete(row: T) {
    if (!window.confirm("Delete this record? This can't be undone.")) return;
    const { error } = await createClient().from(table).delete().eq("id", row.id);
    if (error) {
      toast("error", "Couldn't delete", error.message);
      return;
    }
    refetch();
  }

  return (
    <div>
      {compact ? (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          {canWrite && hasReadAccess && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
      ) : (
        <PageHeader
          title={title}
          description={description}
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: breadcrumbLabel ?? title }]}
          action={
            canWrite &&
            hasReadAccess && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            )
          }
        />
      )}

      {!hasReadAccess ? (
        <Card>
          <p className="py-8 text-center text-sm text-slate-500">
            You don&rsquo;t have access to this module.
          </p>
        </Card>
      ) : (
        <Card className="p-0">
          {loadError && (
            <p className="border-b border-rose-100 bg-rose-50 px-5 py-2.5 text-xs text-rose-700">
              Couldn&rsquo;t load the latest data: {loadError}
            </p>
          )}
          <Table
            columns={[
              ...relationColumns,
              ...columns,
              ...(canDelete
                ? [
                    {
                      key: "__actions",
                      header: "",
                      render: (r: T) => <DeleteButton onDelete={() => handleDelete(r)} />,
                    },
                  ]
                : []),
            ]}
            rows={rows}
            loading={loading}
            emptyTitle="Nothing here yet"
            onRowClick={canWrite ? openEdit : undefined}
          />
        </Card>
      )}

      {canWrite && (
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title={`${editing ? "Edit" : "Add"} ${breadcrumbLabel ?? title}`}
          width={480}
        >
          <FormBody
            fields={visibleFields}
            values={values}
            setValues={setValues}
            lookups={lookups}
            saving={saving}
            onCancel={() => setOpen(false)}
            onSubmit={handleSubmit}
          />
        </Drawer>
      )}
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
      aria-label="Delete"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function FormBody({
  fields,
  values,
  setValues,
  lookups,
  saving,
  onCancel,
  onSubmit,
}: {
  fields: FieldDef[];
  values: Record<string, string>;
  setValues: (v: Record<string, string>) => void;
  lookups: Record<string, Lookup>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {fields.map((f) => (
        <FieldInput key={f.key} field={f} lookups={lookups} value={values[f.key] ?? ""} onChange={(v) => setValues({ ...values, [f.key]: v })} />
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

const selectClassName =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-oasis-400 focus:ring-4 focus:ring-oasis-100";

function FieldInput({
  field,
  lookups,
  value,
  onChange,
}: {
  field: FieldDef;
  lookups: Record<string, Lookup>;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "textarea") {
    return (
      <Field label={field.label}>
        <textarea className={textareaClassName} rows={3} value={value} onChange={(e) => onChange(e.target.value)} required={field.required} />
      </Field>
    );
  }
  if (field.type === "boolean-select") {
    return (
      <Field label={field.label}>
        <select value={value} onChange={(e) => onChange(e.target.value)} required={field.required} className={selectClassName}>
          <option value="">Select…</option>
          <option value="true">{field.trueLabel}</option>
          <option value="false">{field.falseLabel}</option>
        </select>
      </Field>
    );
  }
  if (field.type === "select") {
    return (
      <Field label={field.label}>
        <select value={value} onChange={(e) => onChange(e.target.value)} required={field.required} className={selectClassName}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "relation") {
    return (
      <Field label={field.label}>
        <select value={value} onChange={(e) => onChange(e.target.value)} required={field.required} className={selectClassName}>
          <option value="">Select…</option>
          {[...lookupFor(lookups, field)].map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <Field label={field.label}>
      <Input type={field.type} placeholder={field.placeholder} value={value} onChange={(e) => onChange(e.target.value)} required={field.required} />
    </Field>
  );
}
