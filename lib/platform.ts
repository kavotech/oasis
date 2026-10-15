"use client";

import { createClient } from "@/lib/supabase/client";

/** Calls the platform-admin Edge Function (OASIS developers only) and
 * unwraps its { error } replies into a plain message. */
export async function platformAction(body: Record<string, unknown>): Promise<{ error: string | null; data?: Record<string, unknown> }> {
  const { data, error } = await createClient().functions.invoke("platform-admin", { body });
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

export const STATUS_LABEL: Record<string, string> = {
  pending_review: "Pending review",
  more_info_requested: "More info requested",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const STATUS_TONE: Record<string, "warning" | "info" | "success" | "danger" | "neutral"> = {
  pending_review: "warning",
  more_info_requested: "info",
  approved: "success",
  rejected: "danger",
  suspended: "neutral",
};
