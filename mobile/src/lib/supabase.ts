import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { demoClient } from "@/demo/client";
import { isDemo } from "@/demo/mode";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(url && anonKey) || isDemo();

// Same project as the website: one schema, one set of RLS policies, and
// Realtime keeps both clients in sync.
const realClient = createClient<Database>(url || "https://not-configured.supabase.co", anonKey || "missing", {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Every caller imports this one client; in demo mode it transparently
// serves the local snapshot instead (see src/demo).
export const supabase = new Proxy(realClient, {
  get(target, prop, receiver) {
    if (isDemo()) return (demoClient as unknown as Record<PropertyKey, unknown>)[prop];
    const value = Reflect.get(target, prop, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
}) as typeof realClient;

// Only refresh tokens while the app is in the foreground (Supabase's
// recommended React Native setup).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export type TableName = keyof Database["public"]["Tables"] & string;
