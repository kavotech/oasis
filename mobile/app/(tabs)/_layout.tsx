import { Redirect, Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.oasis600,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: colors.slate100 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Feather name="grid" size={size - 2} color={color} /> }} />
      <Tabs.Screen name="modules" options={{ title: "Modules", tabBarIcon: ({ color, size }) => <Feather name="layers" size={size - 2} color={color} /> }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color, size }) => <Feather name="user" size={size - 2} color={color} /> }} />
    </Tabs>
  );
}
