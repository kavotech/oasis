"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TextField, PasswordField, Checkbox, Spinner, SuccessIcon, ErrorIcon } from "@/components/auth/FormFields";
import { AuthLogo, AuthWordmark } from "@/components/auth/AuthLogo";
import { loadApplication, saveApplication } from "@/lib/onboarding-storage";
import { useAuth } from "@/lib/auth/AuthProvider";
import { redirectPathForRole } from "@/lib/auth/roles";
import { SchoolCombobox, UNLISTED_SCHOOL } from "@/components/auth/SchoolCombobox";

type Status = "idle" | "loading" | "success" | "error";
type Mode = "login" | "signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthPage({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [direction, setDirection] = useState<"forward" | "backward">(mode === "signup" ? "forward" : "backward");

  function switchMode(next: Mode) {
    if (next === mode) return;
    setDirection(next === "signup" ? "forward" : "backward");
    router.push(next === "signup" ? "/signup" : "/login");
  }

  return (
    <div className="auth-shell" id="main-content">
      <div className="auth-bg-blob-3" aria-hidden="true" />

      <div className="auth-outer">
        <aside className="auth-panel">
          <div className="auth-panel-logo">
            <AuthLogo />
          </div>
          <div className="auth-panel-copy">
            {mode === "login" ? (
              <>
                <h2>One platform. Every school.</h2>
                <p>
                  Sign in to manage admissions, attendance, fees, timetables and more &#8212; all in one place, built
                  for schools across Uganda.
                </p>
              </>
            ) : (
              <>
                <h2>Start your OASIS journey.</h2>
                <p>
                  Tell us a little about your school and we&#8217;ll take you straight into the guided registration
                  &#8212; no paperwork, no waiting on hold.
                </p>
              </>
            )}
            <div className="auth-panel-stats">
              <div>
                <strong>10+</strong>
                <span>hours saved weekly</span>
              </div>
              <div>
                <strong>95%</strong>
                <span>faster fee collection</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>parent &amp; teacher access</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="auth-form-col">
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ marginBottom: 20 }}>
              <AuthWordmark />
            </div>

            <div className="auth-mode-toggle" role="tablist" aria-label="Sign in or create an account">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={`auth-mode-btn${mode === "login" ? " is-active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={`auth-mode-btn${mode === "signup" ? " is-active" : ""}`}
                onClick={() => switchMode("signup")}
              >
                Sign up
              </button>
            </div>

            <div className="auth-flip-stage">
              <div key={mode} className={`auth-card auth-flip-face ${direction === "forward" ? "enter-from-right" : "enter-from-left"}`}>
                {mode === "login" ? <LoginForm /> : <SignupForm onDone={() => switchMode("login")} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const { signIn, signOut } = useAuth();
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ school?: string; email?: string; password?: string }>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");

  function validate() {
    const next: { school?: string; email?: string; password?: string } = {};
    if (!school) next.school = "Choose your school.";
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

    // The account must belong to the school picked above (OASIS super admins
    // and schools still under review are exempt).
    if (result.role !== "super_admin" && school !== UNLISTED_SCHOOL && result.schoolId !== school) {
      await signOut();
      setStatus("error");
      setFormError("This account isn't registered at the school you picked. Check the school and try again.");
      return;
    }

    if (result.role === "school_admin" && result.schoolStatus && result.schoolStatus !== "approved") {
      router.push("/register/pending");
      return;
    }

    setStatus("success");
    router.push(redirectPathForRole(result.role));
  }

  if (status === "success") return <SuccessState email={email} />;

  return (
    <>
      <h1>Welcome back</h1>
      <p className="auth-subtitle">Sign in to your OASIS account to continue.</p>

      {status === "error" && formError && (
        <div className="auth-alert auth-alert-error" role="alert">
          <ErrorIcon />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <SchoolCombobox value={school} onChange={setSchool} error={errors.school} allowUnlisted />
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
          <Link href="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="auth-btn auth-btn-primary" disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <Spinner /> Signing in&hellip;
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="auth-footer-text">
        Need help? <a href="mailto:support@oasis.co.ug" className="auth-link">Contact support</a>
      </p>

      <div className="auth-footer-links">
        <Link href="/privacy-notice-cookie-statement/">Privacy</Link>
        <Link href="/legal-statement/">Terms</Link>
        <Link href="/">OASIS.co.ug</Link>
      </div>
    </>
  );
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const { sendSignupOtp, completeSignup, signIn } = useAuth();

  const [step, setStep] = useState<"details" | "code">("details");
  // new = register a new school (becomes its admin); staff / parent = join a
  // school that already has you on file (checked by create-account).
  const [mode, setMode] = useState<"new" | "staff" | "parent">("new");
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  function validateDetails() {
    const next: Record<string, string> = {};
    if (mode === "new" && !schoolName.trim()) next.schoolName = "Enter your school's name.";
    if (mode !== "new" && !schoolId) next.school = "Choose your school.";
    if (!fullName.trim()) next.fullName = "Enter your name.";
    if (!email.trim()) next.email = "Enter a work email address.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!validateDetails()) return;
    setStatus("loading");
    const result = await sendSignupOtp(email.trim());
    setStatus("idle");
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setStep("code");
  }

  async function handleVerifyAndCreate(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (code.trim().length !== 6) {
      setFormError("Enter the 6-digit code we emailed you.");
      return;
    }
    setStatus("loading");

    const created = await completeSignup(
      mode === "new"
        ? { email: email.trim(), code: code.trim(), password, fullName: fullName.trim(), role: "school_admin", newSchoolName: schoolName.trim() }
        : { email: email.trim(), code: code.trim(), password, fullName: fullName.trim(), role: mode === "parent" ? "parent" : "teacher", schoolId }
    );
    if (created.error) {
      setStatus("idle");
      setFormError(created.error);
      return;
    }

    // create-account already created the school (pending_review) and
    // linked profile.school_id via user_metadata - nothing left to do here
    // but sign in.
    const signedIn = await signIn({ email: email.trim(), password });
    if (signedIn.error) {
      setStatus("idle");
      setFormError(signedIn.error);
      return;
    }

    if (mode !== "new") {
      setStatus("idle");
      router.push(redirectPathForRole(signedIn.role));
      return;
    }

    const app = loadApplication();
    saveApplication({
      ...app,
      data: {
        ...app.data,
        organisation: { ...app.data.organisation, schoolName: schoolName.trim(), schoolEmail: email.trim() },
      },
    });

    setStatus("idle");
    router.push("/register");
  }

  if (step === "code") {
    return (
      <>
        <h1>Enter your code</h1>
        <p className="auth-subtitle">We&#8217;ve sent a 6-digit code to {email}. It expires in 10 minutes.</p>

        {formError && (
          <div className="auth-alert auth-alert-error" role="alert">
            <ErrorIcon />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleVerifyAndCreate} noValidate>
          <TextField
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <button type="submit" className="auth-btn auth-btn-primary" disabled={status === "loading"}>
            {status === "loading" ? (
              <>
                <Spinner /> Creating your account&hellip;
              </>
            ) : (
              "Verify and continue"
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          <button
            type="button"
            className="auth-link"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
            onClick={() => setStep("details")}
          >
            Back
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <div role="tablist" aria-label="Account type" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "rgba(22,20,12,0.06)", marginBottom: 20 }}>
        {([
          ["new", "New school"],
          ["staff", "I'm staff"],
          ["parent", "I'm a parent"],
        ] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setErrors({});
              setFormError("");
            }}
            style={{
              flex: 1,
              padding: "8px 6px",
              border: 0,
              borderRadius: 9,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: mode === m ? 700 : 500,
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? "#16140c" : "#635f56",
              boxShadow: mode === m ? "0 1px 3px rgba(22,20,12,0.12)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <h1>{mode === "new" ? "Create your school account" : mode === "staff" ? "Join your school as staff" : "Join as a parent"}</h1>
      <p className="auth-subtitle">
        {mode === "new"
          ? "Start with the basics - you'll complete the full registration in the next step. Your login works right away; your school just needs approval before your dashboard unlocks."
          : mode === "staff"
            ? "Use the email your school admin added you with - your classes and access come from your school."
            : "Use the email your school has on file for you - you'll see your children's attendance, results and fees."}
      </p>

      {formError && (
        <div className="auth-alert auth-alert-error" role="alert">
          <ErrorIcon />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleRequestCode} noValidate>
        {mode === "new" ? (
          <TextField
            label="School name"
            autoComplete="organization"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            error={errors.schoolName}
            success={schoolName.trim().length > 1}
            required
          />
        ) : (
          <SchoolCombobox value={schoolId} onChange={setSchoolId} error={errors.school} />
        )}
        <TextField
          label="Your name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          success={fullName.trim().length > 1}
          required
        />
        <TextField
          label="Work email address"
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
          required
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />

        <button type="submit" className="auth-btn auth-btn-primary" disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <Spinner /> Sending code&hellip;
            </>
          ) : (
            mode === "new" ? "Continue to registration" : "Continue"
          )}
        </button>
      </form>

      <p className="auth-footer-text">
        Already have an account?{" "}
        <button type="button" className="auth-link" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }} onClick={onDone}>
          Sign in
        </button>
      </p>

      <div className="auth-footer-links">
        <Link href="/privacy-notice-cookie-statement/">Privacy</Link>
        <Link href="/legal-statement/">Terms</Link>
        <Link href="/">OASIS.co.ug</Link>
      </div>
    </>
  );
}

function SuccessState({ email }: { email: string }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#eaf7ee",
          color: "#1e7b34",
          display: "grid",
          placeContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <SuccessIcon />
      </div>
      <h1>You&#8217;re signed in</h1>
      <p className="auth-subtitle">Welcome back, {email}. Taking you to your dashboard&hellip;</p>
      <Link href="/" className="auth-btn auth-btn-secondary" style={{ textDecoration: "none", marginTop: 8 }}>
        Return to homepage
      </Link>
    </div>
  );
}
