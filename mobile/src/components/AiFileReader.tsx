import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "./Text";
import { Button } from "./ui";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database.types";
import { colors } from "@/theme";

type Extraction = Tables<"school_file_extractions">;
type Counts = { students: number; parents: number; staff: number; classes: number };
type Result = { warnings: string[]; students: { full_name: string; class: string | null; stream: string | null; guardians: { name: string; phone: string | null }[] }[]; staff: { full_name: string }[] };
type Imported = { students: number; parents: number; links: number; staff: number; classes: number; streams: number; skipped_students: number; skipped_staff: number };

async function call(body: Record<string, unknown>): Promise<string | null> {
  const { error } = await supabase.functions.invoke("extract-school-data", { body });
  if (!error) return null;
  const ctx = (error as { context?: Response }).context;
  try {
    const j = ctx ? await ctx.clone().json() : null;
    return j?.error ?? error.message;
  } catch {
    return error.message;
  }
}

/** "Read with AI" for one uploaded file - same flow as the website. */
export function AiFileReader({ fileId }: { fileId: string }) {
  const [ex, setEx] = useState<Extraction | null>(null);
  const [busy, setBusy] = useState<"read" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("school_file_extractions").select("*").eq("file_id", fileId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setEx((data as Extraction | null) ?? null);
  }, [fileId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(kind: "read" | "import") {
    setBusy(kind);
    setError(null);
    const err = await call(kind === "read" ? { file_id: fileId } : { action: "import", extraction_id: ex?.id });
    await load();
    setBusy(null);
    if (err) setError(err);
  }

  const counts = ex?.counts as unknown as Counts | null;
  const result = ex?.result as unknown as Result | null;
  const imported = ex?.import_result as unknown as Imported | null;

  if (!ex || ex.status === "failed" || busy === "read")
    return (
      <View style={{ gap: 6 }}>
        <Button size="sm" variant="secondary" icon="zap" loading={busy === "read"} onPress={() => run("read")}>
          {busy === "read" ? "Reading with AI…" : ex?.status === "failed" ? "Try reading again" : "Read with AI"}
        </Button>
        {busy === "read" && <Text style={{ fontSize: 12, color: colors.slate500 }}>Claude is reading the file - up to a minute for big files.</Text>}
        {!busy && (error || ex?.error) ? <Text style={{ fontSize: 12, color: colors.rose600 }}>{error || ex?.error}</Text> : null}
      </View>
    );

  return (
    <View style={{ borderRadius: 14, padding: 12, backgroundColor: "rgba(148,152,239,0.1)", gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather name={ex.status === "imported" ? "check-circle" : "zap"} size={15} color={ex.status === "imported" ? colors.emerald600 : colors.oasis600} />
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.slate900 }}>{ex.status === "imported" ? "Imported" : ex.status === "processing" ? "Reading…" : "AI reading ready"}</Text>
      </View>
      {ex.summary ? <Text style={{ fontSize: 13, color: colors.slate600, lineHeight: 18 }}>{ex.summary}</Text> : null}
      {counts && (
        <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.slate700 }}>
          {counts.students} students · {counts.parents} parents · {counts.staff} staff · {counts.classes} classes
        </Text>
      )}
      {result?.warnings?.map((w, i) => (
        <Text key={i} style={{ fontSize: 12, color: colors.amber700 }}>
          • {w}
        </Text>
      ))}
      {imported && (
        <Text style={{ fontSize: 12.5, color: colors.emerald600 }}>
          Added {imported.students} students, {imported.parents} new parents, {imported.staff} staff
          {imported.classes ? `, ${imported.classes} classes` : ""}.{imported.skipped_students ? ` ${imported.skipped_students} were already in OASIS.` : ""}
        </Text>
      )}
      {error && <Text style={{ fontSize: 12, color: colors.rose600 }}>{error}</Text>}
      {result && result.students.length > 0 && (
        <Pressable onPress={() => setOpen((o) => !o)}>
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.oasis600 }}>{open ? "Hide preview" : "Show what was found"}</Text>
        </Pressable>
      )}
      {open &&
        result?.students.slice(0, 25).map((s, i) => (
          <Text key={i} style={{ fontSize: 12, color: colors.slate700 }} numberOfLines={1}>
            {s.full_name} · {[s.class, s.stream].filter(Boolean).join(" ") || "no class"}
            {s.guardians.length ? ` · ${s.guardians.map((g) => g.name).join(", ")}` : ""}
          </Text>
        ))}
      {ex.status === "ready" && counts && counts.students + counts.staff + counts.classes > 0 && (
        <Button size="sm" icon="upload-cloud" loading={busy === "import"} onPress={() => run("import")} style={{ marginTop: 4 }}>
          Import into school
        </Button>
      )}
    </View>
  );
}
