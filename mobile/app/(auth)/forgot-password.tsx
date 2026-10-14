import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";
import { colors } from "@/theme";

// Same two-step OTP flow as the website: send-otp (password_reset) then
// reset-password-otp with the emailed code.
export default function ForgotPassword() {
  const { sendPasswordResetOtp, resetPasswordWithOtp } = useAuth();
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    if (!email.trim()) return setError("Enter the email on your account.");
    setLoading(true);
    setError(null);
    const { error } = await sendPasswordResetOtp(email);
    setLoading(false);
    if (error) setError(error);
    else setStep("code");
  }

  async function reset() {
    if (code.trim().length < 4) return setError("Enter the code from your email.");
    if (password.length < 8) return setError("Choose a password with at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setLoading(true);
    setError(null);
    const { error } = await resetPasswordWithOtp({ email, code: code.trim(), newPassword: password });
    setLoading(false);
    if (error) setError(error);
    else setStep("done");
  }

  const back = (
    <Pressable onPress={() => router.replace("/login")}>
      <Text style={{ color: colors.oasis600, fontWeight: "600", fontSize: 14 }}>← Back to sign in</Text>
    </Pressable>
  );

  if (step === "done") {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <Button size="lg" onPress={() => router.replace("/login")}>
          Sign in
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={step === "email" ? "Reset your password" : "Check your email"}
      subtitle={step === "email" ? "We'll email you a one-time code." : `Enter the code we sent to ${email.trim()} and choose a new password.`}
      footer={back}
    >
      {error && <ErrorBanner message={error} />}
      {step === "email" ? (
        <>
          <Field label="Email">
            <Input value={email} onChangeText={setEmail} placeholder="you@school.ac.ug" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Button size="lg" onPress={sendCode} loading={loading}>
            Send code
          </Button>
        </>
      ) : (
        <>
          <Field label="Code">
            <Input value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" textContentType="oneTimeCode" maxLength={8} />
          </Field>
          <Field label="New password">
            <Input value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" placeholder="At least 8 characters" />
          </Field>
          <Field label="Confirm password">
            <Input value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" />
          </Field>
          <Button size="lg" onPress={reset} loading={loading}>
            Update password
          </Button>
          <View style={{ alignItems: "center", marginTop: 14 }}>
            <Pressable onPress={sendCode}>
              <Text style={{ color: colors.slate500, fontSize: 13 }}>Didn&apos;t get it? Send again</Text>
            </Pressable>
          </View>
        </>
      )}
    </AuthShell>
  );
}
