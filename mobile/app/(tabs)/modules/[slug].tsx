import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModuleView } from "@/screens/ModuleView";

export default function ModuleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ModuleView slug={String(slug)} topInset={8} showBreadcrumb={false} showBack />
    </SafeAreaView>
  );
}
