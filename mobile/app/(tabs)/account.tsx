import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Glass } from "@/components/glass";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { ROLE_LABELS, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader } from "@/components/ui";
import { colors } from "@/theme";
import { TAB_BAR_SPACE } from "@/components/GlassTabBar";

export default function Account() {
  const { user, profile, role, signOut, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);

  async function saveName() {
    if (!user || !fullName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    setSaving(false);
    if (error) Alert.alert("Couldn't save", error.message);
    else {
      await refreshProfile();
      Alert.alert("Saved", "Your name has been updated.");
    }
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  const name = profile?.full_name || user?.email || "Account";

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: TAB_BAR_SPACE + 24 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate("/"))} accessibilityLabel="Back" style={{ alignSelf: "flex-start", marginBottom: 12 }}>
          <Glass radius={22} interactive style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Feather name="chevron-left" size={22} color={colors.slate700} />
          </Glass>
        </Pressable>
        <PageHeader title="Account" />
        <Card style={{ marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={name} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.slate900 }}>{name}</Text>
            <Text style={{ fontSize: 13, color: colors.slate500, marginTop: 2 }}>{user?.email}</Text>
            <View style={{ marginTop: 8 }}>
              <Badge tone="info">{role ? ROLE_LABELS[role] : "No role"}</Badge>
            </View>
          </View>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Profile" subtitle="Shown to staff across OASIS." />
          <Field label="Full name">
            <Input value={fullName} onChangeText={setFullName} />
          </Field>
          <Button onPress={saveName} loading={saving} disabled={!fullName.trim() || fullName.trim() === profile?.full_name}>
            Save changes
          </Button>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="On the web" subtitle="Full dashboard, reports and school settings." />
          <Button variant="secondary" icon="external-link" onPress={() => Linking.openURL("https://oasis.co.ug/login")}>
            Open oasis.co.ug
          </Button>
        </Card>

        <Button variant="danger" icon="log-out" onPress={confirmSignOut}>
          Sign out
        </Button>
        <Text style={{ textAlign: "center", color: colors.slate400, fontSize: 12, marginTop: 20 }}>OASIS v{Constants.expoConfig?.version ?? "1.0.0"}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
