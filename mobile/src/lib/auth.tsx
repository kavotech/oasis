import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Enums, Tables } from "@/types/database.types";

export type UserRole = Enums<"user_role">;
type Profile = Tables<"profiles">;
type AuthResult = { error: string | null };

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
  bursar: "Bursar",
  librarian: "Librarian",
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendPasswordResetOtp: (email: string) => Promise<AuthResult>;
  resetPasswordWithOtp: (input: { email: string; code: string; newPassword: string }) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Same friendly copy as the website's AuthProvider.
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Please try again.";
  if (m.includes("email not confirmed")) return "Please verify your email address before signing in.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch")) return "We couldn't reach the server. Check your connection and try again.";
  return message;
}

// Edge Functions reply { error: string } on failure; unwrap it for the UI.
async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // fall through
    }
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const user = session?.user ?? null;

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) loadProfile(next.user.id);
      else setProfile(null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) return { error: friendlyAuthError(error?.message ?? "Sign in failed.") };
      await loadProfile(data.user.id);
      return { error: null };
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendPasswordResetOtp = useCallback(async (email: string) => {
    const { error } = await supabase.functions.invoke("send-otp", { body: { email: email.trim(), purpose: "password_reset" } });
    return { error: error ? await functionErrorMessage(error) : null };
  }, []);

  const resetPasswordWithOtp = useCallback(async ({ email, code, newPassword }: { email: string; code: string; newPassword: string }) => {
    const { error } = await supabase.functions.invoke("reset-password-otp", { body: { email: email.trim(), code, newPassword } });
    return { error: error ? await functionErrorMessage(error) : null };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: (profile?.role as UserRole | undefined) ?? null,
        loading,
        signIn,
        signOut,
        sendPasswordResetOtp,
        resetPasswordWithOtp,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
