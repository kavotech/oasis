import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";
import { colors } from "@/theme";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.replace("/(tabs)");
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your OASIS school account."
      footer={
        <Text style={{ color: colors.slate500, fontSize: 14 }}>
          New school?{" "}
          <Text style={{ color: colors.oasis600, fontWeight: "600" }} onPress={() => Linking.openURL("https://oasis.co.ug/register")}>
            Register on the website
          </Text>
        </Text>
      }
    >
      {error && <ErrorBanner message={error} />}
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
