import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { modules } from "@/modules/registry";
import { colors } from "@/theme";
import { Glass } from "./glass";

/** The website dashboard's module tile grid (2-up on phones), as glass tiles. */
export function ModuleGrid() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {modules.map((m) => (
        <Pressable
          key={m.slug}
          onPress={() => router.push(`/modules/${m.slug}`)}
          style={({ pressed }) => ({ width: "47.5%", flexGrow: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
        >
          <Glass radius={20} interactive style={{ padding: 16, gap: 12, minHeight: 96 }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: "rgba(148,152,239,0.16)", alignItems: "center", justifyContent: "center" }}>
              <Feather name={m.icon} size={18} color={colors.oasis600} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.slate800 }} numberOfLines={2}>
              {m.label}
            </Text>
          </Glass>
        </Pressable>
      ))}
    </View>
  );
}
