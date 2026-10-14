import { Platform } from "react-native";

// "Explore the demo": the whole app runs against a local snapshot of the
// OASIS Demo School (src/demo/fixture.json) instead of Supabase. Nothing is
// sent to the server. On web, ?demo=1 starts in demo mode (used for the
// marketing screenshots).
let active = Platform.OS === "web" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";

export const isDemo = () => active;
export const enableDemo = () => {
  active = true;
};
export const disableDemo = () => {
  active = false;
};
