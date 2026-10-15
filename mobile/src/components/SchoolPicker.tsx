import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Modal, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./Text";
import { SearchInput, s } from "./ui";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme";

export type SchoolOption = { id: string; name: string; district: string | null; logo_url: string | null };
/** "My school isn't listed" - a school still under review after sign-up. */
export const UNLISTED_SCHOOL = "__unlisted";
/** OASIS developers sign in to the platform console, not a school. */
export const OASIS_TEAM = "__oasis";
const LAST_SCHOOL_KEY = "oasis.lastSchool";

const BADGE_COLORS = ["#5f61c9", "#0d9488", "#b45309", "#be123c", "#0369a1", "#7c3aed", "#15803d", "#c2410c"];
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** A school's logo, or a crest-style monogram when it has none (or it fails). */
export function SchoolLogo({ school, size = 40 }: { school: Pick<SchoolOption, "name" | "logo_url">; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (school.logo_url && !failed) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: colors.slate100 }}>
        <Image source={{ uri: school.logo_url }} style={{ width: size * 0.72, height: size * 0.72 }} resizeMode="contain" onError={() => setFailed(true)} />
      </View>
    );
  }
  const initials = school.name
    .replace(/^(the|st\.?)\s+/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !["of", "and", "the"].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const color = BADGE_COLORS[hash(school.name) % BADGE_COLORS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + "1f", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: color + "55" }}>
      <Text style={{ color, fontWeight: "800", fontSize: size * 0.34 }}>{initials || "?"}</Text>
    </View>
  );
}

/** Approved schools are public, so this works before sign-in. */
export function useSchools() {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase
      .from("schools")
      .select("id, name, district, logo_url")
      .eq("status", "approved")
      .order("name")
      .then(({ data }) => {
        setSchools(((data as SchoolOption[]) ?? []).sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      });
  }, []);
  return { schools, loading };
}

/** Searchable school dropdown with logos, remembering the last choice. */
export function SchoolPicker({ value, onChange, allowUnlisted = false }: { value: string; onChange: (id: string) => void; allowUnlisted?: boolean }) {
  const { schools, loading } = useSchools();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (value) return;
    AsyncStorage.getItem(LAST_SCHOOL_KEY)
      .then((id) => {
        if (id && (schools.some((sc) => sc.id === id) || (allowUnlisted && (id === UNLISTED_SCHOOL || id === OASIS_TEAM)))) onChange(id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools]);

  const selected = schools.find((sc) => sc.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? schools.filter((sc) => sc.name.toLowerCase().includes(q) || sc.district?.toLowerCase().includes(q)) : schools;
  }, [schools, query]);

  function pick(id: string) {
    onChange(id);
    AsyncStorage.setItem(LAST_SCHOOL_KEY, id).catch(() => {});
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[s.input, s.selectTrigger, { height: 56 }]}>
        {selected ? <SchoolLogo school={selected} size={34} /> : <Feather name="home" size={18} color={colors.slate400} />}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, color: selected || value === UNLISTED_SCHOOL || value === OASIS_TEAM ? colors.slate900 : colors.slate400 }} numberOfLines={1}>
            {selected?.name ?? (value === UNLISTED_SCHOOL ? "My school isn't listed yet" : value === OASIS_TEAM ? "OASIS team (developers)" : loading ? "Loading schools…" : "Select your school…")}
          </Text>
          {selected?.district ? <Text style={{ fontSize: 12, color: colors.slate500 }}>{selected.district}</Text> : null}
        </View>
        <Feather name="chevron-down" size={18} color={colors.slate400} />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Your school</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Feather name="x" size={22} color={colors.slate500} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <SearchInput value={query} onChangeText={setQuery} placeholder={`Search ${schools.length} schools…`} autoFocus />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(sc) => sc.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingTop: 4 }}
            ListEmptyComponent={<Text style={{ color: colors.slate500, textAlign: "center", padding: 24 }}>No schools match "{query}".</Text>}
            ListFooterComponent={
              allowUnlisted ? (
                <>
                <Pressable onPress={() => pick(UNLISTED_SCHOOL)} style={[s.option, { marginTop: 6 }]}>
                  <Feather name="clock" size={18} color={colors.slate500} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.optionText, { color: colors.slate700 }]}>My school isn't listed yet</Text>
                    <Text style={{ fontSize: 12, color: colors.slate500 }}>Newly registered and still under review</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => pick(OASIS_TEAM)} style={s.option}>
                  <Feather name="code" size={18} color={colors.oasis600} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.optionText, { color: colors.slate700 }]}>OASIS team (developers)</Text>
                    <Text style={{ fontSize: 12, color: colors.slate500 }}>Platform console - approve schools, manage access</Text>
                  </View>
                </Pressable>
                </>
              ) : null
            }
            renderItem={({ item }) => {
              const active = item.id === value;
              return (
                <Pressable onPress={() => pick(item.id)} style={[s.option, { justifyContent: "flex-start", gap: 12 }, active && { backgroundColor: colors.oasis50, borderColor: colors.oasis200 }]}>
                  <SchoolLogo school={item} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionText, active && { color: colors.oasis700 }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.district ? <Text style={{ fontSize: 12, color: colors.slate500 }}>{item.district}</Text> : null}
                  </View>
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
