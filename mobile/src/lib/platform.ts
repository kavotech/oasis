import { supabase } from "./supabase";

/** Calls the platform-admin Edge Function (OASIS developers only) and
 * unwraps its { error } replies into a plain message - same as the website. */
export async function platformAction(body: Record<string, unknown>): Promise<{ error: string | null; data?: Record<string, unknown> }> {
  const { data, error } = await supabase.functions.invoke("platform-admin", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    try {
      const j = ctx ? await ctx.clone().json() : null;
      return { error: j?.error ?? error.message };
    } catch {
      return { error: error.message };
    }
  }
  return { error: null, data: data as Record<string, unknown> };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Directory listings (DIR-*) and the demo school aren't registrations. */
export const isRegistration = (s: { code: string | null }) => !s.code?.startsWith("DIR-") && s.code !== "OASIS-DEMO";
