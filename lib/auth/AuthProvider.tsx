"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import type { UserRole } from "./roles";

type Profile = Tables<"profiles">;

type AuthResult = { error: string | null };
type SchoolStatus = Tables<"schools">["status"];
type SignInResult = AuthResult & { role: UserRole | null; schoolStatus?: SchoolStatus | null; schoolId?: string | null };
type SelfServiceRole = Exclude<UserRole, "super_admin">;

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  // Signup and password reset are both OTP-driven, shared with the mobile
  // app via its send-otp / create-account / reset-password-otp Edge
  // Functions - Supabase's own confirmation emails are never used.
  sendSignupOtp: (email: string) => Promise<AuthResult>;
  // For role: "school_admin", pass newSchoolName - create-account creates
  // the school itself now. For every other role, pass schoolId (must be an
  // already-approved school - the "select your school" step).
  completeSignup: (input: {
    email: string;
    code: string;
    password: string;
    fullName: string;
    role: SelfServiceRole;
    newSchoolName?: string;
    schoolId?: string;
  }) => Promise<AuthResult>;
  signIn: (input: { email: string; password: string; rememberMe?: boolean }) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  sendPasswordResetOtp: (email: string) => Promise<AuthResult>;
  resetPasswordWithOtp: (input: { email: string; code: string; newPassword: string }) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Friendly copies for the Supabase Auth error messages we're most likely
// to hit, so the UI never shows a raw API error string.
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Please try again.";
  if (m.includes("email not confirmed")) return "Please verify your email address before signing in - check your inbox for the confirmation link.";
  if (m.includes("user already registered") || m.includes("already been registered")) return "An account with that email already exists. Try signing in instead.";
  if (m.includes("password should be at least") || m.includes("password is too short")) return "Choose a password with at least 8 characters.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("expired") || m.includes("invalid") ) return "That link has expired or was already used. Request a new one and try again.";
  if (m.includes("network") || m.includes("fetch")) return "We couldn't reach the server. Check your connection and try again.";
  return message;
}

// supabase.functions.invoke() throws a FunctionsHttpError on non-2xx
// responses whose .context is the raw Response - our Edge Functions always
// reply with { error: string } on failure, so unwrap that for the UI.
async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // fall through to the generic message below
    }
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      setProfile(data ?? null);
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendSignupOtp: AuthContextValue["sendSignupOtp"] = useCallback(
    async (email) => {
      const { error } = await supabase.functions.invoke("send-otp", { body: { email, purpose: "signup_verify" } });
      return { error: error ? await functionErrorMessage(error) : null };
    },
    [supabase]
  );

  const completeSignup: AuthContextValue["completeSignup"] = useCallback(
    async ({ email, code, password, fullName, role, newSchoolName, schoolId }) => {
      const { error } = await supabase.functions.invoke("create-account", {
        body: {
          email,
          code,
          password,
          full_name: fullName,
          role,
          new_school_name: newSchoolName,
          school_id: schoolId,
        },
      });
      return { error: error ? await functionErrorMessage(error) : null };
    },
    [supabase]
  );

  const signIn: AuthContextValue["signIn"] = useCallback(
    async ({ email, password, rememberMe }) => {
      // "Remember me" controls whether the session persists across browser
      // restarts vs. only for the current tab session.
      if (typeof window !== "undefined") {
        window.localStorage.setItem("oasis_remember_me", rememberMe ? "1" : "0");
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { error: friendlyAuthError(error?.message ?? "Sign in failed."), role: null };
      }

      // Accounts only ever get created after their signup OTP is verified
      // (see create-account), so any existing profile is already confirmed -
      // there's no separate "unverified" state to gate on here.
      const { data: profileRow } = await supabase.from("profiles").select("role, school_id").eq("id", data.user.id).maybeSingle();
      const role = (profileRow?.role as UserRole | undefined) ?? null;

      // school_admin accounts are created up-front at signup, before the
      // school is approved - gate dashboard access on the linked school's
      // review status rather than assuming approval.
      if (role === "school_admin" && profileRow?.school_id) {
        const { data: school } = await supabase.from("schools").select("status").eq("id", profileRow.school_id).maybeSingle();
        return { error: null, role, schoolStatus: school?.status ?? null, schoolId: profileRow.school_id };
      }

      return { error: null, role, schoolId: profileRow?.school_id ?? null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const sendPasswordResetOtp: AuthContextValue["sendPasswordResetOtp"] = useCallback(
    async (email) => {
      const { error } = await supabase.functions.invoke("send-otp", { body: { email, purpose: "password_reset" } });
      return { error: error ? await functionErrorMessage(error) : null };
    },
    [supabase]
  );

  const resetPasswordWithOtp: AuthContextValue["resetPasswordWithOtp"] = useCallback(
    async ({ email, code, newPassword }) => {
      const { error } = await supabase.functions.invoke("reset-password-otp", { body: { email, code, newPassword } });
      return { error: error ? await functionErrorMessage(error) : null };
    },
    [supabase]
  );

  const value: AuthContextValue = {
    user,
    session,
    profile,
    role: (profile?.role as UserRole | undefined) ?? null,
    loading,
    sendSignupOtp,
    completeSignup,
    signIn,
    signOut,
    sendPasswordResetOtp,
    resetPasswordWithOtp,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
