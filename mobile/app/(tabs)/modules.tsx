import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { modules } from "@/modules/registry";
import { Card, PageHeader, SearchInput } from "@/components/ui";
import { colors } from "@/theme";

/** The website's sidebar, as a searchable list. */
export default function Modules() {
  const [query, setQuery] = useState("");
  const list = query.trim() ? modules.filter((m) => m.label.toLowerCase().includes(query.trim().toLowerCase())) : modules;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <PageHeader title="Modules" description="Everything in your OASIS school dashboard." />
        <View style={{ marginBottom: 14 }}>
          <SearchInput value={query} onChangeText={setQuery} placeholder="Search modules…" />
        </View>
        <Card padded={false}>
          {list.map((m, i) => (
            <Pressable
              key={m.slug}
              onPress={() => router.push(`/module/${m.slug}`)}
              style={({ pressed }) => [
                { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.slate100 },
                pressed && { backgroundColor: colors.oasis50 },
              ]}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.oasis50, alignItems: "center", justifyContent: "center" }}>
                <Feather name={m.icon} size={17} color={colors.oasis600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: "600", color: colors.slate800 }}>{m.label}</Text>
                <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 1 }} numberOfLines={1}>
                  {m.description}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.slate300} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
