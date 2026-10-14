// React Native ports of the website portal's UI primitives
// (components/portal/ui/*). Same colours, radii, weights and spacing.
import { useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadow, toneColors, type Tone } from "@/theme";
import { Glass } from "./glass";

export type IconName = keyof typeof Feather.glyphMap;

// Layout keys belong on the outer (shadow) wrapper; the rest styles the glass.
const OUTER_KEYS = ["flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf", "width", "minWidth", "maxWidth", "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical"] as const;
function splitStyle(style: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) ((OUTER_KEYS as readonly string[]).includes(k) ? outer : inner)[k] = v;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { outer, inner } = splitStyle(style);
  return (
    <View style={[s.cardShadow, outer]}>
      <Glass radius={radius.card + 4} style={[padded && { padding: 20 }, inner]}>
        {children}
      </Glass>
    </View>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={s.cardHeader}>
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle}>{title}</Text>
        {subtitle ? <Text style={s.cardSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
}: {
  title: string;
  description?: string;
  breadcrumb?: string;
  action?: ReactNode;
}) {
  return (
    <View style={s.pageHeader}>
      <View style={{ flex: 1 }}>
        {breadcrumb ? (
          <View style={s.breadcrumbs}>
            <Text style={s.breadcrumbText}>Dashboard</Text>
            <Feather name="chevron-right" size={12} color={colors.slate400} />
            <Text style={[s.breadcrumbText, { color: colors.slate600 }]}>{breadcrumb}</Text>
          </View>
        ) : null}
        <Text style={s.pageTitle}>{title}</Text>
        {description ? <Text style={s.pageDescription}>{description}</Text> : null}
      </View>
      {action}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  const height = size === "sm" ? 34 : size === "lg" ? 50 : 44;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 15 : 14;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        { height, backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border, paddingHorizontal: size === "sm" ? 12 : 18 },
        variant === "primary" && shadow.card,
        (disabled || loading) && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Feather name={icon} size={fontSize + 2} color={v.fg} /> : null}
      <Text style={[s.buttonText, { color: v.fg, fontSize }]}>{children}</Text>
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: colors.oasis500, pressed: colors.oasis600, fg: "#fff", border: colors.oasis500 },
  secondary: { bg: "#fff", pressed: colors.slate50, fg: colors.slate700, border: colors.slate200 },
  ghost: { bg: "transparent", pressed: colors.slate100, fg: colors.slate600, border: "transparent" },
  danger: { bg: colors.rose50, pressed: colors.rose100, fg: colors.rose600, border: colors.rose50 },
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const t = toneColors[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <Text style={[s.badgeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      {children}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Input({ style, multiline, ...rest }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.slate400}
      {...rest}
      multiline={multiline}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        rest.onBlur?.(e);
      }}
      style={[s.input, multiline && { height: 96, paddingTop: 12, textAlignVertical: "top" }, focused && s.inputFocused, style]}
    />
  );
}

/** The web form's <select>: a field that opens a bottom sheet of options. */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowClear = true,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const filtered = query.trim() ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())) : options;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[s.input, s.selectTrigger]}>
        <Text style={{ flex: 1, fontSize: 15, color: selected ? colors.slate900 : colors.slate400 }} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.slate400} />
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{placeholder.replace("…", "")}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Feather name="x" size={22} color={colors.slate500} />
            </Pressable>
          </View>
          {options.length > 8 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <SearchInput value={query} onChangeText={setQuery} placeholder="Search…" />
            </View>
          )}
          <FlatList
            data={allowClear ? [{ value: "", label: "None" }, ...filtered] : filtered}
            keyExtractor={(o) => o.value || "__none"}
            contentContainerStyle={{ padding: 16, paddingTop: 4 }}
            ListEmptyComponent={<Text style={{ color: colors.slate500, textAlign: "center", padding: 24 }}>Nothing to choose from yet.</Text>}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={[s.option, active && { backgroundColor: colors.oasis50, borderColor: colors.oasis200 }]}
                >
                  <Text style={[s.optionText, !item.value && { color: colors.slate400 }, active && { color: colors.oasis700 }]}>{item.label}</Text>
                  {active && <Feather name="check" size={18} color={colors.oasis600} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

// Dates are stored as Postgres `date` (YYYY-MM-DD) and times as HH:MM, the
// same strings the website writes - built from local parts, never toISOString,
// so a date picked late in the evening doesn't land on the next day.
const pad = (n: number) => String(n).padStart(2, "0");
const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeString = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parseValue(value: string, mode: "date" | "time"): Date | null {
  if (mode === "date") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

function formatValue(value: string, mode: "date" | "time"): string | null {
  const d = parseValue(value, mode);
  if (!d) return null;
  return mode === "date" ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : toTimeString(d);
}

/** Tap-to-pick date or time: a calendar/spinner sheet on iOS, the native
 * dialog on Android. */
export function DateTimeField({
  value,
  onChange,
  mode,
  placeholder,
  allowClear = true,
}: {
  value: string;
  onChange: (v: string) => void;
  mode: "date" | "time";
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(new Date());
  const label = formatValue(value, mode);
  const commit = (d: Date) => onChange(mode === "date" ? toDateString(d) : toTimeString(d));

  function show() {
    const initial = parseValue(value, mode) ?? new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: initial, mode, is24Hour: true, onValueChange: (_e, d) => commit(d) });
      return;
    }
    setDraft(initial);
    setOpen(true);
  }

  return (
    <>
      <Pressable onPress={show} style={[s.input, s.selectTrigger]}>
        <Feather name={mode === "date" ? "calendar" : "clock"} size={16} color={label ? colors.oasis500 : colors.slate400} />
        <Text style={{ flex: 1, fontSize: 15, color: label ? colors.slate900 : colors.slate400 }}>
          {label ?? placeholder ?? (mode === "date" ? "Pick a date" : "Pick a time")}
        </Text>
        {label && allowClear ? (
          <Pressable onPress={() => onChange("")} hitSlop={10}>
            <Feather name="x-circle" size={16} color={colors.slate300} />
          </Pressable>
        ) : null}
      </Pressable>
      {Platform.OS !== "android" && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.25)" }} onPress={() => setOpen(false)} />
          <SafeAreaView edges={["bottom"]} style={s.pickerSheet}>
            <View style={s.pickerHeader}>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={{ fontSize: 15, color: colors.slate500 }}>Cancel</Text>
              </Pressable>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.slate900 }}>{mode === "date" ? "Choose date" : "Choose time"}</Text>
              <Pressable
                onPress={() => {
                  commit(draft);
                  setOpen(false);
                }}
                hitSlop={10}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.oasis600 }}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode={mode}
              display={mode === "date" ? "inline" : "spinner"}
              locale="en-GB"
              accentColor={colors.oasis500}
              themeVariant="light"
              onValueChange={(_e, d) => setDraft(d)}
              style={{ alignSelf: "stretch" }}
            />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

export function SearchInput(props: TextInputProps) {
  return (
    <View style={s.search}>
      <Feather name="search" size={16} color={colors.slate400} />
      <TextInput placeholderTextColor={colors.slate400} style={{ flex: 1, fontSize: 15, color: colors.slate900 }} autoCorrect={false} {...props} />
    </View>
  );
}

export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.oasis100, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.oasis700, fontWeight: "700", fontSize: size * 0.36 }}>{initials || "?"}</Text>
    </View>
  );
}

export function EmptyState({ icon = "inbox", title, description }: { icon?: IconName; title: string; description?: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Feather name={icon} size={22} color={colors.oasis500} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {description ? <Text style={s.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

const accentColors = {
  oasis: { bg: colors.oasis50, fg: colors.oasis600 },
  emerald: { bg: colors.emerald50, fg: colors.emerald600 },
  amber: { bg: colors.amber50, fg: colors.amber600 },
  sky: { bg: colors.sky50, fg: colors.sky600 },
};

export function StatCard({
  label,
  value,
  icon,
  accent = "oasis",
  trendLabel,
}: {
  label: string;
  value: string;
  icon: IconName;
  accent?: keyof typeof accentColors;
  trendLabel?: string;
}) {
  const a = accentColors[accent];
  return (
    <Card style={{ flex: 1 }} padded={false}>
      <View style={{ padding: 18 }}>
        <View style={[s.iconBox, { backgroundColor: a.bg }]}>
          <Feather name={icon} size={18} color={a.fg} />
        </View>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
        {trendLabel ? <Text style={s.statTrend}>{trendLabel}</Text> : null}
      </View>
    </Card>
  );
}

export function Spinner() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <ActivityIndicator color={colors.oasis500} />
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={s.errorBanner}>
      <Feather name="alert-circle" size={14} color={colors.rose700} />
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  cardShadow: {
    borderRadius: radius.card + 4,
    shadowColor: "#4c4ea3",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.slate900 },
  cardSubtitle: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  pageHeader: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: 20 },
  breadcrumbs: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  breadcrumbText: { fontSize: 12, color: colors.slate400, fontWeight: "500" },
  pageTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.4, color: colors.slate900 },
  pageDescription: { fontSize: 14, color: colors.slate500, marginTop: 4, lineHeight: 20 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonText: { fontWeight: "600" },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  label: { fontSize: 13, fontWeight: "600", color: colors.slate700, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.slate400, marginTop: 4 },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,152,239,0.22)",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.slate900,
  },
  inputFocused: { borderColor: colors.oasis400, shadowColor: colors.oasis400, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  selectTrigger: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.slate900 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.slate100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  optionText: { fontSize: 15, color: colors.slate800, fontWeight: "500" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,152,239,0.18)",
    backgroundColor: "rgba(118,118,128,0.10)",
    paddingHorizontal: 12,
  },
  empty: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 16 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.oasis50, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: colors.slate800, textAlign: "center" },
  emptyDescription: { fontSize: 13, color: colors.slate500, marginTop: 4, textAlign: "center", lineHeight: 19 },
  iconBox: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4, color: colors.slate900, marginTop: 14 },
  statLabel: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  statTrend: { fontSize: 11, color: colors.slate400, marginTop: 6 },
  pickerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.rose50,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 12.5, color: colors.rose700 },
});
