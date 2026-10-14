import { SafeAreaView } from "react-native-safe-area-context";
import { ModuleView } from "@/screens/ModuleView";

export default function AttendanceTab() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ModuleView slug="attendance" topInset={16} showBreadcrumb={false} />
    </SafeAreaView>
  );
}
