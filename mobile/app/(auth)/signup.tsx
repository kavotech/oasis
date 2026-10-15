import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/components/Text";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorBanner, Field, Input } from "@/components/ui";
import { colors } from "@/theme";
import { SchoolPicker } from "@/components/SchoolPicker";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the website's SignupForm (components/auth/AuthPage.tsx): details,
// then the emailed 6-digit code, then create-account + sign in. The school
// starts pending_review, so the app shows the approval screen next.
export default function Signup() {
  const { sendSignupOtp, completeSignup, signIn } = useAuth();
  const [step, setStep] = useState<"details" | "code">("details");
  // new = register a new school (becomes its admin); staff / parent = join a
  // school that already has you on file.
  // ?mode=staff|parent deep-links straight to joining (e.g. a link a school sends its teachers).
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"new" | "staff" | "parent" | "developer">(params.mode === "staff" || params.mode === "parent" || params.mode === "developer" ? params.mode : "new");
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode() {
    if (mode === "new" && !schoolName.trim()) return setError("Enter your school's name.");
    if ((mode === "staff" || mode === "parent") && !schoolId) return setError("Choose your school.");
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
    const created = await completeSignup(
      mode === "new"
        ? { email, code: code.trim(), password, fullName, schoolName }
        : mode === "developer"
          ? { email, code: code.trim(), password, fullName, role: "super_admin" }
          : { email, code: code.trim(), password, fullName, role: mode === "parent" ? "parent" : "teacher", schoolId }
    );
    if (created.error) {
      setLoading(false);
      return setError(created.error);
    }
    const signedIn = await signIn(email, password);
    setLoading(false);
    if (signedIn.error) return setError(signedIn.error);
    router.replace(mode === "new" ? "/register" : mode === "developer" ? "/platform" : "/");
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
      title={mode === "new" ? "Create your school account" : mode === "staff" ? "Join your school as staff" : mode === "developer" ? "Join the OASIS team" : "Join as a parent"}
      subtitle={
        mode === "new"
          ? "Start with the basics. Your login works right away; your school just needs approval before your dashboard unlocks."
          : mode === "staff"
            ? "Use the email your school admin added you with - your classes and access come from the school."
            : mode === "developer"
              ? "For OASIS developers. Use the email another developer added for you in the console."
            : "Use the email your school has on file for you - you'll see your children's attendance, results and fees."
      }
      footer={footer}
    >
      {mode !== "developer" && <View style={{ flexDirection: "row", backgroundColor: "rgba(118,118,128,0.12)", borderRadius: 12, padding: 3, marginBottom: 18 }}>
        {([
          ["new", "New school"],
          ["staff", "I'm staff"],
          ["parent", "I'm a parent"],
        ] as const).map(([m, label]) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              setError(null);
            }}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: mode === m ? "#fff" : "transparent" }}
          >
            <Text style={{ fontSize: 13, fontWeight: mode === m ? "700" : "500", color: mode === m ? colors.slate900 : colors.slate500 }}>{label}</Text>
          </Pressable>
        ))}
      </View>}
      {error && <ErrorBanner message={error} />}
      {mode === "developer" ? null : mode === "new" ? (
        <Field label="School name">
          <Input value={schoolName} onChangeText={setSchoolName} placeholder="e.g. Kampala Parents School" autoCapitalize="words" />
        </Field>
      ) : (
        <Field label="Your school">
          <SchoolPicker value={schoolId} onChange={setSchoolId} />
        </Field>
      )}
      <Field label="Your name">
        <Input value={fullName} onChangeText={setFullName} placeholder="Full name" autoCapitalize="words" textContentType="name" autoComplete="name" />
      </Field>
      <Field label={mode === "parent" ? "Email address" : "Work email address"}>
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
