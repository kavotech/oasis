import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";
import { Backdrop } from "@/components/glass";
import { GlassTabBar } from "@/components/GlassTabBar";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Redirect href="/login" />;

  return (
    <Backdrop>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="students" options={{ title: "Students" }} />
        <Tabs.Screen name="attendance" options={{ title: "Attendance" }} />
        <Tabs.Screen name="messages" options={{ title: "Messages" }} />
        <Tabs.Screen name="modules" options={{ title: "More" }} />
        {/* Reached from the avatar on Home, not the bar. */}
        <Tabs.Screen name="account" options={{ title: "Account", href: null }} />
      </Tabs>
    </Backdrop>
  );
}
