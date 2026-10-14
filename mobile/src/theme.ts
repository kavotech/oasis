// Mirrors the website portal's design tokens (styles/portal.css + the
// Tailwind slate/emerald/amber/rose scales the portal components use) so
// the app and the web dashboard read as one product.
export const colors = {
  oasis50: "#f4f4fe",
  oasis100: "#ecebfd",
  oasis200: "#dbd9fb",
  oasis300: "#bfbdf8",
  oasis400: "#a6a9f7",
  oasis500: "#9498ef",
  oasis600: "#7376e8",
  oasis700: "#5f61c9",
  oasis800: "#4c4ea3",
  oasis900: "#3f4180",

  bg: "#f6f6fb",
  surface: "#ffffff",
  ink: "#16151f",

  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",

  emerald50: "#ecfdf5",
  emerald600: "#059669",
  amber50: "#fffbeb",
  amber600: "#d97706",
  amber700: "#b45309",
  rose50: "#fff1f2",
  rose100: "#ffe4e6",
  rose600: "#e11d48",
  rose700: "#be123c",
  sky50: "#f0f9ff",
  sky600: "#0284c7",
};

export const radius = {
  sm: 10,
  md: 12, // rounded-xl - buttons, inputs
  lg: 16, // rounded-2xl - module tiles
  card: 18, // --radius-card
};

// --shadow-card: 0 1px 2px rgba(16,14,40,.04), 0 8px 24px -8px rgba(16,14,40,.08)
export const shadow = {
  card: {
    shadowColor: "#100e28",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
};

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.slate100, fg: colors.slate600 },
  success: { bg: colors.emerald50, fg: colors.emerald600 },
  warning: { bg: colors.amber50, fg: colors.amber700 },
  danger: { bg: colors.rose50, fg: colors.rose600 },
  info: { bg: colors.oasis50, fg: colors.oasis600 },
};
