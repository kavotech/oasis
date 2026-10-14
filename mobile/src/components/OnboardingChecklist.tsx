import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { supabase, type TableName } from "@/lib/supabase";
import { colors } from "@/theme";
import { Card, CardHeader } from "./ui";

type Step = { key: string; label: string; tables: TableName[]; skippable: boolean };

// Same steps and completion rules as the website's OnboardingChecklist:
// completion is derived from row counts, and schools.onboarding_skipped_steps
// records "not applicable" - shared with the web so both agree.
const STEPS: Step[] = [
  { key: "classes", label: "Classes", tables: ["classes"], skippable: false },
  { key: "staff", label: "Staff", tables: ["staff"], skippable: false },
  { key: "subjects", label: "Subjects", tables: ["subjects"], skippable: false },
  { key: "departments", label: "Departments", tables: ["departments"], skippable: true },
  { key: "fee_structure", label: "Fee Structure", tables: ["fee_categories"], skippable: false },
  { key: "houses", label: "Houses", tables: ["houses"], skippable: true },
  { key: "dormitories", label: "Dormitories", tables: ["dormitories"], skippable: true },
  { key: "transport", label: "Transport Routes", tables: ["transport_routes"], skippable: true },
  { key: "exams_grading", label: "Exam Types & Grading", tables: ["exam_types", "grade_bands"], skippable: true },
];

export function OnboardingChecklist() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [state, setState] = useState<{ done: Record<string, boolean>; skipped: Set<string> } | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    const tables = Array.from(new Set(STEPS.flatMap((s) => s.tables)));
    const [schoolRes, ...counts] = await Promise.all([
      supabase.from("schools").select("name, address, contact_email, onboarding_skipped_steps").eq("id", schoolId).maybeSingle(),
      ...tables.map((t) => supabase.from(t).select("id", { count: "exact", head: true })),
    ]);
    const countBy = Object.fromEntries(tables.map((t, i) => [t, counts[i].count ?? 0]));
    const school = schoolRes.data;
    const done: Record<string, boolean> = {
      school_profile: !!(school?.name && school?.address && school?.contact_email),
    };
    for (const step of STEPS) done[step.key] = step.tables.every((t) => countBy[t] > 0);
    setState({ done, skipped: new Set(school?.onboarding_skipped_steps ?? []) });
  }, [schoolId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function skip(key: string) {
    if (!schoolId || !state) return;
    const next = Array.from(new Set([...state.skipped, key]));
    setState({ ...state, skipped: new Set(next) });
    await supabase.from("schools").update({ onboarding_skipped_steps: next }).eq("id", schoolId);
  }

  if (!state) return null;
  const steps = [{ key: "school_profile", label: "School Profile", tables: [], skippable: false }, ...STEPS];
  const resolved = steps.filter((s) => state.done[s.key] || state.skipped.has(s.key));
  if (resolved.length === steps.length) return null;
  const pct = Math.round((resolved.length / steps.length) * 100);

  return (
    <Card style={{ marginBottom: 20 }}>
      <CardHeader title="Finish setting up your school" subtitle={`${resolved.length} of ${steps.length} steps done`} />
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.oasis50, marginBottom: 14, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: 6, backgroundColor: colors.oasis500 }} />
      </View>
      {steps.map((step) => {
        const done = state.done[step.key] || state.skipped.has(step.key);
        return (
          <Pressable
            key={step.key}
            onPress={() => !done && step.key !== "school_profile" && router.push("/modules/setup")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderWidth: 1,
              borderColor: colors.slate100,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 8,
            }}
          >
            <Feather name={done ? "check-circle" : "circle"} size={17} color={done ? "#10b981" : colors.slate300} />
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                color: done ? colors.slate500 : colors.slate700,
                fontWeight: done ? "400" : "500",
                textDecorationLine: done ? "line-through" : "none",
              }}
            >
              {step.label}
            </Text>
            {!done && step.skippable && (
              <Pressable onPress={() => skip(step.key)} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="minus-circle" size={13} color={colors.slate400} />
                <Text style={{ fontSize: 12, color: colors.slate400 }}>Not applicable</Text>
              </Pressable>
            )}
          </Pressable>
        );
      })}
    </Card>
  );
}
