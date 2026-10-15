"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextField, PasswordField, Checkbox, Spinner, ErrorIcon } from "@/components/auth/FormFields";
import { AuthLogo, AuthWordmark } from "@/components/auth/AuthLogo";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "error";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, signOut } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [joining, setJoining] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setStatus("loading");
    const result = await signIn({ email: email.trim(), password, rememberMe: remember });

    if (result.error) {
      setStatus("error");
      setFormError(result.error);
      return;
    }

    if (result.role !== "super_admin") {
      await signOut();
      setStatus("error");
      setFormError("This console is for OASIS and Swivel Technologies staff only.");
      return;
    }

    router.push("/portal/dashboard");
  }

  return (
    <div className="auth-shell" id="main-content">
      <div className="auth-bg-blob-3" aria-hidden="true" />

      <div className="auth-outer">
        <aside className="auth-panel">
          <div className="auth-panel-logo">
            <AuthLogo srcOverride="/images/logo1.png" href="/" />
          </div>
          <div className="auth-panel-copy">
            <h2>Platform console.</h2>
            <p>
              Sign in to manage schools, subscriptions, platform health and support &#8212; for OASIS &amp; Swivel
              Technologies staff only.
            </p>
            <div className="auth-panel-stats">
              <div>
                <strong>10+</strong>
                <span>schools onboarded</span>
              </div>
              <div>
                <strong>95%</strong>
                <span>platform uptime</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>monitoring &amp; support</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="auth-form-col">
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ marginBottom: 20 }}>
              <AuthWordmark href="/" />
            </div>

            <div className="auth-card">
              {joining ? (
                <DeveloperJoin onBack={() => setJoining(false)} />
              ) : (
              <>
              <h1>Staff sign in</h1>
              <p className="auth-subtitle">This console is for OASIS and Swivel Technologies staff.</p>

              {status === "error" && formError && (
                <div className="auth-alert auth-alert-error" role="alert">
                  <ErrorIcon />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <TextField
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  success={EMAIL_RE.test(email)}
                  required
                />
                <PasswordField
                  label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  required
                />

                <div className="auth-checkbox-row">
                  <Checkbox label="Remember me" checked={remember} onChange={setRemember} />
                  <span style={{ color: "#a19d95", fontSize: 14 }}>Internal use only</span>
                </div>

                <button type="submit" className="auth-btn auth-btn-primary" disabled={status === "loading"}>
                  {status === "loading" ? (
                    <>
                      <Spinner /> Signing in&hellip;
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <p className="auth-footer-text">
                New OASIS developer?{" "}
                <button type="button" className="auth-link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }} onClick={() => setJoining(true)}>
                  Join as an OASIS developer
                </button>
              </p>
              </>
              )}

              <div className="auth-footer-links">
                <Link href="/privacy-notice-cookie-statement/">Privacy</Link>
                <Link href="/legal-statement/">Terms</Link>
                <Link href="/">OASIS.co.ug</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Developer sign-up: only emails an existing developer has added (Developers
 * page) can create a login. Same email-code flow as everyone else; the server
 * checks the allow-list before creating the account. */
function DeveloperJoin({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { sendSignupOtp, signIn } = useAuth();
  const [step, setStep] = useState<"details" | "code">("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    if (!fullName.trim()) return setError("Enter your name.");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    const r = await sendSignupOtp(email.trim());
    setLoading(false);
    if (r.error) return setError(r.error);
    setStep("code");
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (code.trim().length !== 6) return setError("Enter the 6-digit code we emailed you.");
    setLoading(true);
    const { error: fnError } = await createClient().functions.invoke("create-account", {
      body: { email: email.trim(), code: code.trim(), password, full_name: fullName.trim(), role: "super_admin" },
    });
    if (fnError) {
      const ctx = (fnError as { context?: Response }).context;
      let msg = fnError.message;
      try {
        msg = (await ctx?.clone().json())?.error ?? msg;
      } catch {}
      setLoading(false);
      return setError(msg);
    }
    const signedIn = await signIn({ email: email.trim(), password });
    setLoading(false);
    if (signedIn.error) return setError(signedIn.error);
    router.push("/portal/dashboard");
  }

  return (
    <>
      <h1>{step === "details" ? "Join as an OASIS developer" : "Enter your code"}</h1>
      <p className="auth-subtitle">
        {step === "details"
          ? "Use the email an OASIS developer added for you on the Developers page."
          : `We sent a 6-digit code to ${email.trim()}.`}
      </p>
      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          <ErrorIcon />
          <span>{error}</span>
        </div>
      )}
      {step === "details" ? (
        <form onSubmit={sendCode} noValidate>
          <TextField label="Your name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <TextField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <PasswordField label="Password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." required />
          <PasswordField label="Confirm password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
            {loading ? <><Spinner /> Sending code&hellip;</> : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={create} noValidate>
          <TextField label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
            {loading ? <><Spinner /> Creating account&hellip;</> : "Create developer account"}
          </button>
        </form>
      )}
      <p className="auth-footer-text">
        <button type="button" className="auth-link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }} onClick={onBack}>
          &larr; Back to staff sign in
        </button>
      </p>
    </>
  );
}
