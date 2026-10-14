import { Stack } from "expo-router";

// Both screens draw their own header (PageHeader + round glass back button),
// so the native header stays hidden.
export default function ModulesStack() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }} />;
}
