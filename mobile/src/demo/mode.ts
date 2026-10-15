import { Platform } from "react-native";

// "Explore the demo": the whole app runs against a local snapshot of the
// OASIS Demo School (src/demo/fixture.json) instead of Supabase. Nothing is
// sent to the server. On web, ?demo=1 starts in demo mode (used for the
// marketing screenshots).
let active = Platform.OS === "web" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";

// ?as=developer (with ?demo=1) shows the developer console with made-up
// registrations instead of the school. Read once at startup, before the
// router rewrites the URL.
export const demoAsDeveloper = active && new URLSearchParams(window.location.search).get("as") === "developer";

export const isDemo = () => active;
export const enableDemo = () => {
  active = true;
};
export const disableDemo = () => {
  active = false;
};
