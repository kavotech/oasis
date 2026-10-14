import { Stack, useLocalSearchParams } from "expo-router";
import { findModule } from "@/modules/registry";
import { ModuleView } from "@/screens/ModuleView";

export default function ModuleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const mod = findModule(String(slug));
  return (
    <>
      <Stack.Screen options={{ title: mod?.label ?? "" }} />
      <ModuleView slug={String(slug)} />
    </>
  );
}
