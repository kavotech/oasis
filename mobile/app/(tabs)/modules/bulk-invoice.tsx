import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/Text";
import { ToolScreen, useClasses } from "@/components/ToolScreen";
import { Button, Card, DateTimeField, ErrorBanner, Field, Input, Select } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme";

type Category = { id: string; name: string; amount: number; class_id: string | null };

/** One invoice for every active student in a class. Students who already
 * have an invoice with the same description are skipped, so it's safe to
 * run twice. */
export default function BulkInvoice() {
  const { profile, role } = useAuth();
  const { classes } = useClasses();
  const [categories, setCategories] = useState<Category[]>([]);
  const [classId, setClassId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [alreadyBilled, setAlreadyBilled] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canWrite = role === "school_admin" || role === "teacher" || role === "bursar";

  useEffect(() => {
    supabase
      .from("fee_categories")
      .select("id, name, amount, class_id")
      .order("name")
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    if (!classId) return setStudentIds([]);
    supabase
      .from("students")
      .select("id")
      .eq("class_id", classId)
      .eq("status", "active")
      .then(({ data }) => setStudentIds(((data as { id: string }[]) ?? []).map((s) => s.id)));
  }, [classId]);

  useEffect(() => {
    const desc = description.trim();
    if (!desc || !studentIds.length) return setAlreadyBilled(new Set());
    supabase
      .from("fee_invoices")
      .select("student_id")
      .eq("description", desc)
      .in("student_id", studentIds)
      .then(({ data }) => setAlreadyBilled(new Set(((data as { student_id: string }[]) ?? []).map((r) => r.student_id))));
  }, [description, studentIds]);

  function pickCategory(id: string) {
    setCategoryId(id);
    const c = categories.find((x) => x.id === id);
    if (!c) return;
    setDescription(c.name);
    setAmount(String(c.amount));
    if (c.class_id) setClassId(c.class_id);
  }

  const toBill = studentIds.filter((id) => !alreadyBilled.has(id));
  const amountNum = Number(amount);
  const total = toBill.length * (Number.isFinite(amountNum) ? amountNum : 0);

  async function save() {
    if (!profile?.school_id) return;
    if (!classId) return setError("Choose a class.");
    if (!description.trim()) return setError("Add a description, e.g. Term 3 Tuition.");
    if (!(amountNum > 0)) return setError("Enter an amount greater than zero.");
    if (!toBill.length) return setError("Everyone in this class already has this invoice.");
    setError(null);
    setSaving(true);
    const { error } = await supabase.from("fee_invoices").insert(
      toBill.map((student_id) => ({
        school_id: profile.school_id!,
        student_id,
        description: description.trim(),
        amount: amountNum,
        due_date: dueDate || null,
        status: "unpaid",
      }))
    );
    setSaving(false);
    if (error) return setError(error.message);
    Alert.alert("Invoices created", `${toBill.length} invoice${toBill.length === 1 ? "" : "s"} · UGX ${total.toLocaleString()} in total.`, [
      { text: "Done", onPress: () => (router.canGoBack() ? router.back() : router.navigate("/modules/fees")) },
    ]);
  }

  return (
    <ToolScreen
      title="Invoice a class"
      description="Create the same invoice for every active student in a class."
      footer={
        canWrite && toBill.length && amountNum > 0 && description.trim() ? (
          <Button size="lg" icon="credit-card" onPress={save} loading={saving}>
            Create {toBill.length} invoice{toBill.length === 1 ? "" : "s"}
          </Button>
        ) : null
      }
    >
      {error && <ErrorBanner message={error} />}
      <Field label="Class *">
        <Select value={classId} onChange={setClassId} options={classes.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select class…" />
      </Field>
      {categories.length > 0 && (
        <Field label="Fee category" hint="Fills in the description and amount - you can still edit them.">
          <Select value={categoryId} onChange={pickCategory} options={categories.map((c) => ({ value: c.id, label: `${c.name} · ${Number(c.amount).toLocaleString()}` }))} placeholder="Optional…" />
        </Field>
      )}
      <Field label="Description *">
        <Input value={description} onChangeText={setDescription} placeholder="e.g. Term 3 Tuition" />
      </Field>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Amount (UGX) *">
            <Input value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" placeholder="850000" />
          </Field>
        </View>
        <View style={{ flex: 1.2 }}>
          <Field label="Due date">
            <DateTimeField mode="date" value={dueDate} onChange={setDueDate} />
          </Field>
        </View>
      </View>

      {classId ? (
        <Card style={{ marginTop: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 12, color: colors.slate500, fontWeight: "600" }}>Students to invoice</Text>
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.slate900 }}>{toBill.length}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 12, color: colors.slate500, fontWeight: "600" }}>Total billed</Text>
              <Text style={{ fontSize: 24, fontWeight: "800", color: "#059669" }}>UGX {total.toLocaleString()}</Text>
            </View>
          </View>
          {alreadyBilled.size > 0 && (
            <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 10 }}>
              {alreadyBilled.size} student{alreadyBilled.size === 1 ? " already has" : "s already have"} "{description.trim()}" and will be skipped.
            </Text>
          )}
        </Card>
      ) : null}
    </ToolScreen>
  );
}
