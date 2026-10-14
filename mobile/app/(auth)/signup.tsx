import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/Text";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";
import { colors } from "@/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the website's SignupForm (components/auth/AuthPage.tsx): details,
// then the emailed 6-digit code, then create-account + sign in. The school
// starts pending_review, so the app shows the approval screen next.
export default function Signup() {
  const { sendSignupOtp, completeSignup, signIn } = useAuth();
  const [step, setStep] = useState<"details" | "code">("details");
  const [schoolName, setSchoolName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    if (!schoolName.trim()) return setError("Enter your school's name.");
    if (!fullName.trim()) return setError("Enter your name.");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid work email address.");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    if (confirm !== password) return setError("Passwords don't match.");
    setError(null);
    setLoading(true);
    const result = await sendSignupOtp(email);
    setLoading(false);
    if (result.error) setError(result.error);
    else setStep("code");
  }

  async function create() {
    if (code.trim().length !== 6) return setError("Enter the 6-digit code we emailed you.");
    setError(null);
    setLoading(true);
    const created = await completeSignup({ email, code: code.trim(), password, fullName, schoolName });
    if (created.error) {
      setLoading(false);
      return setError(created.error);
    }
    const signedIn = await signIn(email, password);
    setLoading(false);
    if (signedIn.error) return setError(signedIn.error);
    router.replace("/pending");
  }

  const footer = (
    <Text style={{ color: colors.slate500, fontSize: 14 }}>
      Already have an account?{" "}
      <Text style={{ color: colors.oasis600, fontWeight: "600" }} onPress={() => router.replace("/login")}>
        Sign in
      </Text>
    </Text>
  );

  if (step === "code") {
    return (
      <AuthShell title="Enter your code" subtitle={`We sent a 6-digit code to ${email.trim()}. It expires in 10 minutes.`} footer={footer}>
        {error && <ErrorBanner message={error} />}
        <Field label="6-digit code">
          <Input
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
            placeholder="123456"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            style={{ fontSize: 22, letterSpacing: 8, textAlign: "center" }}
          />
        </Field>
        <Button size="lg" onPress={create} loading={loading}>
          Verify and create account
        </Button>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
          <Pressable onPress={() => setStep("details")}>
            <Text style={{ color: colors.slate500, fontSize: 13.5 }}>← Change details</Text>
          </Pressable>
          <Pressable onPress={requestCode}>
            <Text style={{ color: colors.oasis600, fontSize: 13.5, fontWeight: "600" }}>Resend code</Text>
          </Pressable>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your school account"
      subtitle="Start with the basics. Your login works right away; your school just needs approval before your dashboard unlocks."
      footer={footer}
    >
      {error && <ErrorBanner message={error} />}
      <Field label="School name">
        <Input value={schoolName} onChangeText={setSchoolName} placeholder="e.g. Kampala Parents School" autoCapitalize="words" />
      </Field>
      <Field label="Your name">
        <Input value={fullName} onChangeText={setFullName} placeholder="Full name" autoCapitalize="words" textContentType="name" autoComplete="name" />
      </Field>
      <Field label="Work email address">
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="you@school.ac.ug"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
        />
      </Field>
      <Field label="Password" hint="At least 8 characters">
        <Input value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" autoComplete="new-password" placeholder="••••••••" />
      </Field>
      <Field label="Confirm password">
        <Input value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" placeholder="••••••••" onSubmitEditing={requestCode} returnKeyType="go" />
      </Field>
      <Button size="lg" onPress={requestCode} loading={loading}>
        Continue
      </Button>
    </AuthShell>
  );
}
