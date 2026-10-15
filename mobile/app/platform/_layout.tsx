import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";

/** The OASIS developer console - only super_admin (platform developer)
 * accounts get in. */
export default function PlatformLayout() {
  const { user, role, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Redirect href="/login" />;
  if (role !== "super_admin") return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
