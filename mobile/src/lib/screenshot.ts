import { Platform } from "react-native";

// Web-only hooks for producing App Store / marketing screenshots from the web
// build (see mobile/screenshots/). They never affect the native app.
const params = Platform.OS === "web" && typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

/** ?device=iphone16 - emulate the iPhone 16 safe areas (Dynamic Island +
 * home indicator) so screens lay out exactly as on the phone. */
export const screenshotInsets = params?.get("device") === "iphone16" ? { top: 59, right: 0, bottom: 34, left: 0 } : null;

/** ?slide=N - open the welcome carousel on slide N (0-based). */
export const screenshotSlide = Number(params?.get("slide") ?? 0) || 0;
