import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { Glass } from "./glass";
import type { IconName } from "./ui";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export const TAB_ICONS: Record<string, IconName> = {
  index: "grid",
  students: "users",
  modules: "layers",
  account: "user",
};

/** Height of the floating bar plus its gap - scroll views pad by this so the
 * last row isn't hidden behind the glass. */
export const TAB_BAR_SPACE = 104;

/** Floating, pill-shaped Liquid Glass tab bar (iOS 26 style). */
export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 12) }}>
      <View
        style={{
          borderRadius: 32,
          shadowColor: "#3f4180",
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
        <Glass radius={32} intensity={80} interactive style={{ flexDirection: "row", padding: 6 }}>
          {state.routes.map((route, index) => {
            const options = descriptors[route.key].options;
            const focused = state.index === index;
            const label = typeof options.title === "string" ? options.title : route.name;
            const icon = TAB_ICONS[route.name] ?? "circle";
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={() => {
                  const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                  // Tapping the active tab pops its stack back to the root, as on iOS.
                  else if (focused && !event.defaultPrevented) navigation.navigate(route.name, { screen: "index" });
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 8,
                  borderRadius: 26,
                  backgroundColor: focused ? "rgba(148,152,239,0.18)" : "transparent",
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}
              >
                <Feather name={icon} size={21} color={focused ? colors.oasis700 : colors.slate500} />
                <Text style={{ fontSize: 10.5, marginTop: 3, fontWeight: focused ? "700" : "500", color: focused ? colors.oasis700 : colors.slate500 }}>{label}</Text>
              </Pressable>
            );
          })}
        </Glass>
      </View>
    </View>
  );
}
