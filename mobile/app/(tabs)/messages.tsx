import { SafeAreaView } from "react-native-safe-area-context";
import { ModuleView } from "@/screens/ModuleView";

export default function MessagesTab() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ModuleView slug="communication" topInset={16} showBreadcrumb={false} />
    </SafeAreaView>
  );
}
