// React Native ports of the website portal's UI primitives
// (components/portal/ui/*). Same colours, radii, weights and spacing.
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadow, toneColors, type Tone } from "@/theme";

export type IconName = keyof typeof Feather.glyphMap;

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[s.card, padded && { padding: 20 }, style]}>{children}</View>;
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
    <View style={[s.card, { padding: 18, flex: 1 }]}>
      <View style={[s.iconBox, { backgroundColor: a.bg }]}>
        <Feather name={icon} size={18} color={a.fg} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {trendLabel ? <Text style={s.statTrend}>{trendLabel}</Text> : null}
    </View>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.7)",
    ...shadow.card,
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
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: "#fff",
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
    backgroundColor: "#fff",
    borderRadius: radius.md,
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: "#fff",
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
