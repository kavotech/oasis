import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Backdrop, Glass } from "@/components/glass";
import { Button, Card, ErrorBanner, Field, Input, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { DOCUMENTS, SECTIONS, emptyOnboarding, sectionErrors, type FieldDef, type OnboardingData } from "@/lib/onboarding";
import { formatBytes, uploadSchoolAsset } from "@/lib/uploads";
import { colors } from "@/theme";

type FileRow = { id: string; name: string; size_bytes: number | null; category: string; note: string | null };
const FILES_STEP = SECTIONS.length;

/** Full school registration in the app - the same questions and data as the
 * website wizard, plus documents and the school's own data files. Submitting
 * emails the school a confirmation and alerts the OASIS developers. */
export default function Register() {
  const { profile, user, refreshProfile } = useAuth();
  const schoolId = profile?.school_id ?? null;
  const [data, setData] = useState<OnboardingData>(emptyOnboarding);
  // ?step=N reopens a given step (e.g. "Documents" from an email link).
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState(() => Math.min(Math.max(Number(params.step) || 0, 0), FILES_STEP));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dataNote, setDataNote] = useState("");
  const [done, setDone] = useState(false);
  const [appStatus, setAppStatus] = useState<string | null>(null);

  async function loadFiles() {
    if (!schoolId) return;
    const { data: rows } = await supabase.from("school_files").select("id, name, size_bytes, category, note").eq("school_id", schoolId).order("created_at");
    setFiles((rows as FileRow[]) ?? []);
  }

  useEffect(() => {
    if (!schoolId) return setLoading(false);
    (async () => {
      const [{ data: app }, { data: school }] = await Promise.all([
        supabase.from("school_applications").select("data, status").eq("school_id", schoolId).maybeSingle(),
        supabase.from("schools").select("name, contact_email, contact_phone, district").eq("id", schoolId).maybeSingle(),
      ]);
      setAppStatus(app?.status ?? null);
      const base = emptyOnboarding();
      const saved = (app?.data ?? null) as OnboardingData | null;
      if (saved) for (const k of Object.keys(base)) base[k] = { ...base[k], ...(saved[k] ?? {}) };
      base.organisation.schoolName ||= school?.name ?? "";
      base.organisation.schoolEmail ||= school?.contact_email ?? user?.email ?? "";
      base.organisation.schoolPhone ||= school?.contact_phone ?? "";
      base.location.district ||= school?.district ?? "";
      setData(base);
      await loadFiles();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const set = (section: string, key: string, value: string | string[]) => setData((d) => ({ ...d, [section]: { ...d[section], [key]: value } }));

  async function saveDraft() {
    if (!schoolId || !profile) return;
    await supabase.from("school_applications").upsert({ school_id: schoolId, submitted_by: profile.id, data: data as never, status: appStatus ?? "draft" }, { onConflict: "school_id" });
    if (!appStatus) setAppStatus("draft");
  }

  async function next() {
    const errs = sectionErrors(SECTIONS[step], data);
    setErrors(errs);
    if (errs.length) return;
    setStep((s) => s + 1);
    saveDraft();
  }

  async function pickDocument(key: string) {
    if (!schoolId) return;
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: ["application/pdf", "image/*"] });
    if (res.canceled) return;
    setUploading(key);
    const { error } = await uploadSchoolAsset(schoolId, res.assets[0], "document", key);
    setUploading(null);
    if (error) return Alert.alert("Upload failed", error);
    loadFiles();
  }

  async function pickData() {
    if (!schoolId) return;
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
    if (res.canceled) return;
    setUploading("data");
    const failed: string[] = [];
    for (const asset of res.assets) {
      const { error } = await uploadSchoolAsset(schoolId, asset, "data", dataNote.trim() || undefined);
      if (error) failed.push(`${asset.name}: ${error}`);
    }
    setUploading(null);
    if (failed.length) Alert.alert("Some files didn't upload", failed.join("\n"));
    loadFiles();
  }

  const missingDocs = useMemo(() => DOCUMENTS.filter((d) => d.required && !files.some((f) => f.category === "document" && f.note === d.key)), [files]);

  async function submit() {
    if (!schoolId || !profile) return;
    for (let i = 0; i < SECTIONS.length; i++) {
      const errs = sectionErrors(SECTIONS[i], data);
      if (errs.length) {
        setStep(i);
        setErrors(errs);
        return;
      }
    }
    setSaving(true);
    const org = data.organisation as Record<string, string>;
    const loc = data.location as Record<string, string>;
    const { error: schoolErr } = await supabase
      .from("schools")
      .update({
        name: org.schoolName,
        district: loc.district || null,
        address: [loc.physicalAddress, loc.cityTown, loc.district].filter(Boolean).join(", ") || null,
        contact_name: org.headTeacherName || org.directorName || null,
        contact_email: org.schoolEmail || null,
        contact_phone: org.schoolPhone || null,
        school_type: (data.schoolType.schoolType as string) || null,
        student_band: (data.studentNumbers.currentPopulation as string) || null,
      })
      .eq("id", schoolId);
    const { error: appErr } = await supabase
      .from("school_applications")
      .upsert({ school_id: schoolId, submitted_by: profile.id, data: data as never, status: "submitted", submitted_at: new Date().toISOString() }, { onConflict: "school_id" });
    if (schoolErr || appErr) {
      setSaving(false);
      return setErrors([(schoolErr ?? appErr)!.message]);
    }
    // Confirmation email to the school + alert to every OASIS developer.
    await supabase.functions.invoke("registration-received", { body: {} });
    await refreshProfile();
    setSaving(false);
    setDone(true);
  }

  if (loading) return <Spinner />;

  if (!schoolId)
    return (
      <Screen title="Register your school" onBack={() => router.replace("/")}>
        <ErrorBanner message="This account isn't linked to a school yet. Create a school account first." />
      </Screen>
    );

  if (done)
    return (
      <Screen title="Request received" onBack={() => router.replace("/pending")}>
        <Card>
          <View style={{ alignItems: "center", paddingVertical: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.emerald50, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Feather name="check" size={30} color={colors.emerald600} />
            </View>
            <Text style={{ fontSize: 19, fontWeight: "700", color: colors.slate900, textAlign: "center" }}>OASIS has received your request</Text>
            <Text style={{ fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
              We&apos;ve emailed you a confirmation. Our team will review your school and files, then unlock your dashboard so you can add classes,
              staff and administrators.
            </Text>
          </View>
        </Card>
        <Button size="lg" style={{ marginTop: 16 }} onPress={() => router.replace("/pending")}>
          Done
        </Button>
      </Screen>
    );

  const section = SECTIONS[step];
  const total = SECTIONS.length + 1;

  return (
    <Screen
      title={step === FILES_STEP ? "Documents & school data" : section.title}
      subtitle={step === FILES_STEP ? "Upload your registration documents, plus any files with student, parent or staff lists you'd like on your dashboard." : section.description}
      progress={(step + 1) / total}
      stepLabel={`Step ${step + 1} of ${total}`}
      onBack={() => (step === 0 ? (router.canGoBack() ? router.back() : router.replace("/pending")) : setStep(step - 1))}
      footer={
        step === FILES_STEP ? (
          <Button size="lg" icon="send" onPress={submit} loading={saving}>
            Submit to OASIS
          </Button>
        ) : (
          <Button size="lg" onPress={next}>
            Continue
          </Button>
        )
      }
    >
      {errors.length > 0 && <ErrorBanner message={errors.join("\n")} />}

      {step < FILES_STEP ? (
        <Card>
          {section.fields.map((f) => (
            <FormField key={f.key} field={f} value={data[section.key]?.[f.key]} onChange={(v) => set(section.key, f.key, v)} />
          ))}
        </Card>
      ) : (
        <>
          <Text style={heading}>Registration documents</Text>
          <Card padded={false}>
            {DOCUMENTS.map((d, i) => {
              const uploaded = files.filter((f) => f.category === "document" && f.note === d.key);
              return (
                <View key={d.key} style={[row, i > 0 && divider]}>
                  <Feather name={uploaded.length ? "check-circle" : "file"} size={18} color={uploaded.length ? colors.emerald600 : colors.slate400} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.slate800 }}>
                      {d.label}
                      {d.required ? " *" : ""}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 1 }} numberOfLines={1}>
                      {uploaded.length ? uploaded.map((u) => u.name).join(", ") : d.required ? "Required" : "Optional"}
                    </Text>
                  </View>
                  <Button size="sm" variant="secondary" icon="upload" loading={uploading === d.key} onPress={() => pickDocument(d.key)}>
                    {uploaded.length ? "Add" : "Upload"}
                  </Button>
                </View>
              );
            })}
          </Card>
          {missingDocs.length > 0 && (
            <Text style={{ fontSize: 12.5, color: colors.slate500, marginTop: 8 }}>
              You can submit now and send the remaining {missingDocs.length} required document{missingDocs.length === 1 ? "" : "s"} later - review starts once they&apos;re in.
            </Text>
          )}

          <Text style={[heading, { marginTop: 22 }]}>Your school&apos;s data</Text>
          <Card>
            <Text style={{ fontSize: 13.5, color: colors.slate600, lineHeight: 19, marginBottom: 12 }}>
              Student lists, parents and guardians (a parent can have several children), staff, classes or fee balances - Excel, CSV, PDF or photos.
              Pick as many files as you like; OASIS loads them onto your dashboard.
            </Text>
            <Field label="What's in these files? (optional)">
              <Input value={dataNote} onChangeText={setDataNote} placeholder="e.g. 2026 student list with parents" />
            </Field>
            <Button variant="secondary" icon="folder-plus" loading={uploading === "data"} onPress={pickData}>
              Choose files
            </Button>
            {files
              .filter((f) => f.category === "data")
              .map((f) => (
                <View key={f.id} style={[row, divider, { paddingHorizontal: 0 }]}>
                  <Feather name="database" size={16} color={colors.oasis600} />
                  <Text style={{ flex: 1, fontSize: 13.5, color: colors.slate800 }} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.slate500 }}>{formatBytes(f.size_bytes)}</Text>
                </View>
              ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function FormField({ field, value, onChange }: { field: FieldDef; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const label = `${field.label}${field.required ? " *" : ""}`;
  if (field.kind === "select")
    return (
      <Field label={label} hint={field.hint}>
        <Select value={(value as string) ?? ""} onChange={onChange} options={field.options ?? []} />
      </Field>
    );
  if (field.kind === "multi") {
    const selected = (value as string[]) ?? [];
    return (
      <Field label={label} hint="Tap to choose - you can change these later.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(field.options ?? []).map((o) => {
            const on = selected.includes(o.value);
            return (
              <Pressable
                key={o.value}
                onPress={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: on ? colors.oasis500 : colors.slate200,
                  backgroundColor: on ? colors.oasis500 : "#fff",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: on ? "#fff" : colors.slate700 }}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>
    );
  }
  return (
    <Field label={label} hint={field.hint}>
      <Input
        value={(value as string) ?? ""}
        onChangeText={onChange}
        multiline={field.kind === "long"}
        keyboardType={field.kind === "email" ? "email-address" : field.kind === "phone" ? "phone-pad" : field.kind === "number" ? "number-pad" : field.kind === "url" ? "url" : "default"}
        autoCapitalize={field.kind === "email" || field.kind === "url" ? "none" : "words"}
        autoCorrect={false}
      />
    </Field>
  );
}

function Screen({
  title,
  subtitle,
  progress,
  stepLabel,
  onBack,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  progress?: number;
  stepLabel?: string;
  onBack: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Backdrop>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: footer ? 110 : 30 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Pressable onPress={onBack} accessibilityLabel="Back">
                <Glass radius={22} interactive style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="chevron-left" size={22} color={colors.slate700} />
                </Glass>
              </Pressable>
              {progress !== undefined && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.slate500, marginBottom: 6 }}>{stepLabel}</Text>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(148,152,239,0.2)" }}>
                    <View style={{ height: 6, borderRadius: 3, width: `${Math.round(progress * 100)}%`, backgroundColor: colors.oasis500 }} />
                  </View>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 26, fontWeight: "700", letterSpacing: -0.5, color: colors.slate900 }}>{title}</Text>
            {subtitle ? <Text style={{ fontSize: 14.5, color: colors.slate500, marginTop: 6, marginBottom: 18, lineHeight: 21 }}>{subtitle}</Text> : <View style={{ height: 16 }} />}
            {children}
          </ScrollView>
          {footer ? <View style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Backdrop>
  );
}

const heading = { fontSize: 15, fontWeight: "700" as const, color: colors.slate900, marginBottom: 8 };
const row = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingHorizontal: 14, paddingVertical: 11 };
const divider = { borderTopWidth: 0.5, borderTopColor: "rgba(100,104,180,0.2)" };
