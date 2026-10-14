import { useState, type ComponentProps } from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { router, Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { Glass } from "./glass";
import type { IconName } from "./ui";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export const TAB_ICONS: Record<string, IconName> = {
  index: "home",
  students: "users",
  attendance: "check-circle",
  messages: "message-circle",
  modules: "grid",
};

/** Height of the floating bar plus its gap - scroll views pad by this so the
 * last row isn't hidden behind the glass. */
export const TAB_BAR_SPACE = 108;

const BAR_HEIGHT = 66;

/** WhatsApp-style (iOS 26) navigation: a floating Liquid Glass pill of tabs,
 * the active one in a round bubble, plus a separate round action button. */
export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 14, right: 14, bottom: Math.max(insets.bottom - 6, 12), flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        <View style={[shadow, { flex: 1, borderRadius: BAR_HEIGHT / 2 }]}>
          <Glass radius={BAR_HEIGHT / 2} intensity={85} interactive style={{ height: BAR_HEIGHT, flexDirection: "row", alignItems: "center", paddingHorizontal: 6 }}>
            {state.routes.filter((r) => r.name in TAB_ICONS).map((route) => {
              const options = descriptors[route.key].options;
              const focused = state.routes[state.index]?.key === route.key;
              const label = typeof options.title === "string" ? options.title : route.name;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={label}
                  onPress={() => {
                    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                    if (event.defaultPrevented) return;
                    // Tapping the active tab pops its stack back to the root, as on iOS.
                    navigation.navigate(route.name, focused ? { screen: "index" } : route.params);
                  }}
                  style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}
                >
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: focused ? "rgba(255,255,255,0.75)" : "transparent",
                      borderWidth: focused ? 1 : 0,
                      borderColor: "rgba(148,152,239,0.25)",
                    }}
                  >
                    <Feather name={TAB_ICONS[route.name] ?? "circle"} size={21} color={focused ? colors.oasis700 : colors.slate600} />
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 9.5, marginTop: 2, fontWeight: focused ? "700" : "500", color: focused ? colors.oasis700 : colors.slate500 }}
                    >
                      {label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Glass>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quick actions"
          onPress={() => setActionsOpen(true)}
          style={({ pressed }) => [shadow, { borderRadius: BAR_HEIGHT / 2, transform: [{ scale: pressed ? 0.92 : 1 }] }]}
        >
          <Glass radius={BAR_HEIGHT / 2} intensity={85} interactive tint={colors.oasis500} style={{ width: BAR_HEIGHT, height: BAR_HEIGHT, alignItems: "center", justifyContent: "center" }}>
            <Feather name="plus" size={26} color={colors.oasis700} />
          </Glass>
        </Pressable>
      </View>

      <QuickActions open={actionsOpen} onClose={() => setActionsOpen(false)} bottom={Math.max(insets.bottom - 6, 12) + BAR_HEIGHT + 12} />
    </>
  );
}

export const QUICK_ACTIONS: { label: string; icon: IconName; href: string; color: string }[] = [
  { label: "Take attendance", icon: "check-circle", href: "/attendance?add=1", color: "#10b981" },
  { label: "Add student", icon: "user-plus", href: "/students?add=1", color: colors.oasis600 },
  { label: "New invoice", icon: "credit-card", href: "/modules/fees?add=1", color: "#f59e0b" },
  { label: "Send message", icon: "send", href: "/messages?add=1", color: "#0ea5e9" },
  { label: "Add event", icon: "calendar", href: "/modules/calendar?add=1", color: "#ec4899" },
  { label: "Log behaviour", icon: "award", href: "/modules/behaviour?add=1", color: "#8b5cf6" },
];

function QuickActions({ open, onClose, bottom }: { open: boolean; onClose: () => void; bottom: number }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.18)" }} onPress={onClose}>
        <View style={{ position: "absolute", right: 14, left: 14, bottom }}>
          <View style={[shadow, { borderRadius: 28 }]}>
            <Glass radius={28} intensity={90} style={{ padding: 18 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.slate500, marginBottom: 14, marginLeft: 4 }}>Quick actions</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 18 }}>
                {QUICK_ACTIONS.map((a) => (
                  <Pressable
                    key={a.label}
                    onPress={() => {
                      onClose();
                      router.push(a.href as never);
                    }}
                    style={({ pressed }) => ({ width: "33.33%", alignItems: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}
                  >
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: a.color + "22", alignItems: "center", justifyContent: "center" }}>
                      <Feather name={a.icon} size={22} color={a.color} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.slate700, marginTop: 7, textAlign: "center" }}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Glass>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const shadow = {
  shadowColor: "#3f4180",
  shadowOpacity: 0.2,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 8,
};
