import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { modules } from "@/modules/registry";
import { colors, radius } from "@/theme";

/** The website dashboard's module tile grid (2-up on phones). */
export function ModuleGrid() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {modules.map((m) => (
        <Pressable
          key={m.slug}
          onPress={() => router.push(`/module/${m.slug}`)}
          style={({ pressed }) => ({
            width: "47.5%",
            flexGrow: 1,
            gap: 10,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: pressed ? colors.oasis300 : "rgba(226,232,240,0.7)",
            backgroundColor: "#fff",
            padding: 16,
            transform: [{ translateY: pressed ? -1 : 0 }],
          })}
        >
          <Feather name={m.icon} size={20} color={colors.oasis500} />
          <Text style={{ fontSize: 14, fontWeight: "500", color: colors.slate700 }} numberOfLines={2}>
            {m.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
