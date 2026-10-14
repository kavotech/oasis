import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { friendlyDbError } from "@/lib/db-errors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useLookups, useRealtimeRows } from "@/lib/useRealtimeRows";
import { colors } from "@/theme";
import type { FieldDef, Row, SectionDef } from "@/modules/types";
import { Avatar, Badge, Button, Card, DateTimeField, EmptyState, ErrorBanner, Field, Input, SearchInput, Select, Spinner, s } from "./ui";

type RelationField = Extract<FieldDef, { type: "relation" }>;
const OPTIONAL = /\s*\(optional\)$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function toFormValue(v: unknown, f: FieldDef): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (f.type === "date") return String(v).slice(0, 10);
  if (f.type === "time") return String(v).slice(0, 5);
  return String(v);
}

export function useSectionAccess(section: SectionDef) {
  const { role } = useAuth();
  const canRead = !section.readRoles || (role ? section.readRoles.includes(role) : false);
  const canWrite = role ? section.writeRoles.includes(role) : false;
  const canDelete = role ? (section.deleteRoles ?? ["school_admin"]).includes(role) : false;
  return { role, canRead, canWrite, canDelete };
}

/** One table on a module screen: live list + add/edit sheet. The mobile
 * twin of the website's SimpleModule. */
export function ModuleSection({
  section,
  showTitle,
  refreshSignal = 0,
  autoAddSignal = 0,
}: {
  section: SectionDef;
  showTitle: boolean;
  refreshSignal?: number;
  /** Bumped by quick actions to open the Add form straight away. */
  autoAddSignal?: number;
}) {
  const { profile } = useAuth();
  const { role, canRead, canWrite, canDelete } = useSectionAccess(section);
  const { rows, loading, error, refetch } = useRealtimeRows<Row>(section.table, section.orderBy ?? "created_at", canRead);

  const relationFields = useMemo(() => section.fields.filter((f): f is RelationField => f.type === "relation"), [section]);
  const { lookups, reloadLookups } = useLookups(relationFields.map((f) => `${f.relationTable}.${f.labelKey}`));

  // Pull-to-refresh on the parent screen.
  useEffect(() => {
    if (refreshSignal) {
      refetch();
      reloadLookups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const labelFor = (fieldKey: string, id: string) => {
    const f = relationFields.find((x) => x.key === fieldKey);
    return f ? lookups[`${f.relationTable}.${f.labelKey}`]?.get(id) ?? null : null;
  };
  const relFor = (r: Row) => (fieldKey: string) => {
    const id = r[fieldKey];
    return id ? labelFor(fieldKey, String(id)) : null;
  };

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (autoAddSignal && canWrite) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [autoAddSignal, canWrite]);

  const filtered = query.trim()
    ? rows.filter((r) => {
        const q = query.trim().toLowerCase();
        const rel = relFor(r);
        return [section.item.title(r, rel), section.item.subtitle?.(r, rel)].some((t) => t?.toLowerCase().includes(q));
      })
    : rows;

  if (!canRead) {
    return (
      <Card style={{ marginBottom: 20 }}>
        <EmptyState icon="lock" title="Restricted" description="You don't have access to this module." />
      </Card>
    );
  }

  return (
    <View style={{ marginBottom: 24 }}>
      {(showTitle || canWrite) && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.slate800 }}>{showTitle ? section.title : `${rows.length} records`}</Text>
          {canWrite && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {section.actions?.map((a) => (
                <Button key={a.href} size="sm" variant="secondary" icon={a.icon} onPress={() => router.push(a.href as never)}>
                  {a.label}
                </Button>
              ))}
              <Button
                size="sm"
                icon="plus"
                onPress={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add
              </Button>
            </View>
          )}
        </View>
      )}

      {section.searchable && rows.length > 5 && (
        <View style={{ marginBottom: 12 }}>
          <SearchInput value={query} onChangeText={setQuery} placeholder={`Search ${section.title.toLowerCase()}…`} />
        </View>
      )}

      {error && <ErrorBanner message={`Couldn't load the latest data: ${error}`} />}

      <Card padded={false}>
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState title={query ? "No matches" : "Nothing here yet"} description={!query && canWrite ? "Tap Add to create the first record." : undefined} />
        ) : (
          filtered.map((r, i) => {
            const rel = relFor(r);
            const title = section.item.title(r, rel);
            const subtitle = section.item.subtitle?.(r, rel);
            const meta = section.item.meta?.(r, rel);
            const badge = section.item.badge?.(r);
            return (
              <Pressable
                key={r.id}
                disabled={!canWrite}
                onPress={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
                style={({ pressed }) => [
                  { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(100,104,180,0.18)" },
                  pressed && { backgroundColor: "rgba(148,152,239,0.12)" },
                ]}
              >
                {section.item.avatar && <Avatar name={title} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.slate800 }} numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={{ fontSize: 13, color: colors.slate500, marginTop: 2 }} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  ) : null}
                  {meta ? (
                    <Text style={{ fontSize: 12, color: colors.slate400, marginTop: 3 }} numberOfLines={1}>
                      {meta}
                    </Text>
                  ) : null}
                </View>
                {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
                {canWrite && <Feather name="chevron-right" size={18} color={colors.slate300} />}
              </Pressable>
            );
          })
        )}
      </Card>

      {canWrite && (
        <FormSheet
          open={formOpen}
          onClose={() => setFormOpen(false)}
          section={section}
          editing={editing}
          role={role}
          canDelete={canDelete}
          lookups={lookups}
          labelFor={labelFor}
          schoolId={profile?.school_id ?? null}
          onSaved={() => {
            refetch();
            reloadLookups();
          }}
        />
      )}
    </View>
  );
}

function FormSheet({
  open,
  onClose,
  section,
  editing,
  role,
  canDelete,
  lookups,
  labelFor,
  schoolId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  section: SectionDef;
  editing: Row | null;
  role: string | null;
  canDelete: boolean;
  lookups: Record<string, Map<string, string>>;
  labelFor: (fieldKey: string, id: string) => string | null;
  schoolId: string | null;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fields = section.fields.filter((f) => (!f.editOnly || editing) && (!f.roles || (role ? f.roles.includes(role) : false)));

  function reset() {
    setFormError(null);
    setValues(editing ? Object.fromEntries(section.fields.map((f) => [f.key, toFormValue(editing[f.key], f)])) : {});
  }

  async function save() {
    if (!schoolId) {
      setFormError("Your account isn't linked to a school.");
      return;
    }
    for (const f of fields) {
      const v = values[f.key]?.trim() ?? "";
      if (f.required && !v) return setFormError(`${f.label.replace(OPTIONAL, "")} is required.`);
      if (v && f.type === "date" && !DATE_RE.test(v)) return setFormError(`${f.label}: use the format YYYY-MM-DD.`);
      if (v && f.type === "time" && !TIME_RE.test(v)) return setFormError(`${f.label}: use 24-hour HH:MM.`);
      if (v && f.type === "number" && Number.isNaN(Number(v))) return setFormError(`${f.label} must be a number.`);
    }
    setFormError(null);
    setSaving(true);

    let payload: Record<string, unknown> = editing ? {} : { school_id: schoolId };
    for (const f of fields) {
      if (f.virtual) continue;
      const raw = values[f.key]?.trim() ?? "";
      if (!raw) {
        // Blank on insert -> let the column default apply; blank on edit -> clear it.
        if (editing) payload[f.key] = null;
      } else if (f.type === "number") payload[f.key] = Number(raw);
      else if (f.type === "boolean-select") payload[f.key] = raw === "true";
      else payload[f.key] = raw;
    }
    const ctx = { schoolId, isEdit: !!editing, values, labelFor };
    if (section.transform) payload = section.transform(payload, ctx);

    const result = editing
      ? await supabase.from(section.table).update(payload as never).eq("id", editing.id).select("id").single()
      : section.upsertOn
        ? await supabase.from(section.table).upsert(payload as never, { onConflict: section.upsertOn }).select("id").single()
        : await supabase.from(section.table).insert(payload as never).select("id").single();
    if (result.error || !result.data) {
      setSaving(false);
      setFormError(result.error ? friendlyDbError(result.error.message) : "Couldn't save.");
      return;
    }
    const followUp = section.afterSave ? await section.afterSave((result.data as { id: string }).id, ctx) : null;
    setSaving(false);
    onSaved();
    onClose();
    if (followUp) Alert.alert("Saved with a warning", followUp);
  }

  function confirmDelete() {
    if (!editing) return;
    Alert.alert("Delete this record?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from(section.table).delete().eq("id", editing.id);
          if (error) {
            setFormError(friendlyDbError(error.message));
            return;
          }
          onSaved();
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onShow={reset} onRequestClose={onClose}>
      {/* Web has no native page sheet, so respect the top inset there. */}
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={Platform.OS === "web" ? ["top", "bottom"] : ["bottom"]}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>
            {editing ? "Edit" : "Add"} {section.title.replace(/s$/, "")}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Feather name="x" size={22} color={colors.slate500} />
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4 }} keyboardShouldPersistTaps="handled">
            {formError && <ErrorBanner message={formError} />}
            {fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                lookups={lookups}
                value={values[f.key] ?? ""}
                onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))}
              />
            ))}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              {editing && canDelete && (
                <Button variant="danger" icon="trash-2" onPress={confirmDelete}>
                  Delete
                </Button>
              )}
              <View style={{ flex: 1 }} />
              <Button variant="secondary" onPress={onClose}>
                Cancel
              </Button>
              <Button onPress={save} loading={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FieldInput({
  field,
  lookups,
  value,
  onChange,
}: {
  field: FieldDef;
  lookups: Record<string, Map<string, string>>;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = field.required ? `${field.label} *` : field.label;
  switch (field.type) {
    case "select":
      return (
        <Field label={label}>
          <Select value={value} onChange={onChange} options={field.options} placeholder={`Select ${field.label.toLowerCase()}…`} />
        </Field>
      );
    case "boolean-select":
      return (
        <Field label={label}>
          <Select
            value={value}
            onChange={onChange}
            placeholder={`Select ${field.label.toLowerCase()}…`}
            options={[
              { value: "true", label: field.trueLabel },
              { value: "false", label: field.falseLabel },
            ]}
          />
        </Field>
      );
    case "relation": {
      const map = lookups[`${field.relationTable}.${field.labelKey}`] ?? new Map<string, string>();
      return (
        <Field label={label}>
          <Select
            value={value}
            onChange={onChange}
            placeholder={`Select ${field.label.replace(OPTIONAL, "").toLowerCase()}…`}
            options={[...map].map(([id, l]) => ({ value: id, label: l }))}
          />
        </Field>
      );
    }
    case "textarea":
      return (
        <Field label={label}>
          <Input value={value} onChangeText={onChange} multiline placeholder={field.placeholder} />
        </Field>
      );
    case "date":
    case "time":
      return (
        <Field label={label}>
          <DateTimeField mode={field.type} value={value} onChange={onChange} allowClear={!field.required} />
        </Field>
      );
    case "number":
      return (
        <Field label={label}>
          <Input value={value} onChangeText={onChange} placeholder={field.placeholder} keyboardType="decimal-pad" />
        </Field>
      );
    case "email":
      return (
        <Field label={label}>
          <Input value={value} onChangeText={onChange} placeholder={field.placeholder} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        </Field>
      );
    case "phone":
      return (
        <Field label={label}>
          <Input value={value} onChangeText={onChange} placeholder={field.placeholder} keyboardType="phone-pad" />
        </Field>
      );
    default:
      return (
        <Field label={label}>
          <Input value={value} onChangeText={onChange} placeholder={field.placeholder} />
        </Field>
      );
  }
}
