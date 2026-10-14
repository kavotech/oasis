import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Link, router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";
import { colors } from "@/theme";
import { supabase } from "@/lib/supabase";
import { SchoolPicker, UNLISTED_SCHOOL } from "@/components/SchoolPicker";

export default function Login() {
  const { signIn, signOut, enterDemo } = useAuth();
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!school) {
      setError("Choose your school first.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signIn(email, password);
    if (result.error) {
      setLoading(false);
      return setError(result.error);
    }
    // The account must belong to the school picked above (OASIS super admins
    // and schools still under review are exempt).
    const { data: auth } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("profiles").select("school_id, role").eq("id", auth.user?.id ?? "").maybeSingle();
    if (me && me.role !== "super_admin" && school !== UNLISTED_SCHOOL && me.school_id !== school) {
      await signOut();
      setLoading(false);
      return setError("This account isn't registered at the school you picked. Check the school and try again.");
    }
    setLoading(false);
    router.replace("/");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your OASIS school account."
      footer={
        <View style={{ alignItems: "center", gap: 14 }}>
        <Text style={{ color: colors.slate500, fontSize: 14 }}>
          New school?{" "}
          <Text style={{ color: colors.oasis600, fontWeight: "600" }} onPress={() => router.push("/signup")}>
            Create an account
          </Text>
        </Text>
        <Pressable
          onPress={async () => {
            await enterDemo();
            router.replace("/(tabs)");
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "rgba(148,152,239,0.14)" }}
        >
          <Text style={{ color: colors.oasis700, fontSize: 14, fontWeight: "600" }}>Just looking? Explore the demo school →</Text>
        </Pressable>
        </View>
      }
    >
      {error && <ErrorBanner message={error} />}
      <Field label="School">
        <SchoolPicker value={school} onChange={setSchool} allowUnlisted />
      </Field>
      <Field label="Email">
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@school.ac.ug"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
      </Field>
      <Field label="Password">
        <View>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
            style={{ paddingRight: 64 }}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}>
            <Text style={{ color: colors.oasis600, fontWeight: "600", fontSize: 13 }}>{showPassword ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>
      </Field>
      <Link href="/forgot-password" asChild>
        <Pressable style={{ alignSelf: "flex-end", marginTop: -6, marginBottom: 18 }}>
          <Text style={{ color: colors.oasis600, fontWeight: "600", fontSize: 13 }}>Forgot password?</Text>
        </Pressable>
      </Link>
      <Button size="lg" onPress={submit} loading={loading}>
        Sign in
      </Button>
    </AuthShell>
  );
}
