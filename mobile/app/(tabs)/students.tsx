import { SafeAreaView } from "react-native-safe-area-context";
import { ModuleView } from "@/screens/ModuleView";

export default function StudentsTab() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ModuleView slug="students" topInset={16} showBreadcrumb={false} />
    </SafeAreaView>
  );
}
