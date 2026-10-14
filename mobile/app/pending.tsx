import { useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui";
import { colors } from "@/theme";

const STEPS = [
  { icon: "check-circle" as const, title: "Account created", body: "Your login is ready to use." },
  { icon: "file-text" as const, title: "Finish registration", body: "Add your school's details and documents on the website." },
  { icon: "shield" as const, title: "OASIS review", body: "We check your school and unlock the dashboard - usually within a day." },
];

/** Shown while the signed-in admin's school is still pending_review. */
export default function Pending() {
  const { schoolStatus, refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
    router.replace("/");
  }

  return (
    <AuthShell
      title={schoolStatus === "rejected" ? "Registration not approved" : "Your school is under review"}
      subtitle={
        schoolStatus === "more_info_requested"
          ? "Our team needs a little more information. Please update your registration on the website."
          : schoolStatus === "rejected"
            ? "Please contact OASIS support if you think this is a mistake."
            : "Thanks for joining OASIS. Your dashboard unlocks as soon as your school is approved."
      }
    >
      <View style={{ gap: 14, marginBottom: 22 }}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: i === 0 ? "rgba(16,185,129,0.15)" : "rgba(148,152,239,0.16)",
              }}
            >
              <Feather name={s.icon} size={17} color={i === 0 ? "#059669" : colors.oasis600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: colors.slate900, fontWeight: "600" }}>{s.title}</Text>
              <Text style={{ fontSize: 13.5, color: colors.slate500, marginTop: 2, lineHeight: 19 }}>{s.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <Button size="lg" icon="external-link" onPress={() => Linking.openURL("https://oasis.co.ug/register")}>
        Finish registration
      </Button>
      <Button size="lg" variant="secondary" style={{ marginTop: 10 }} onPress={check} loading={checking}>
        Check approval status
      </Button>
      <Button
        variant="ghost"
        style={{ marginTop: 6 }}
        onPress={async () => {
          await signOut();
          router.replace("/login");
        }}
      >
        Sign out
      </Button>
    </AuthShell>
  );
}
