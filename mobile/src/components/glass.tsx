// Apple-style glass surfaces. On iOS 26+ this is real Liquid Glass
// (expo-glass-effect); on older iOS it's the system "material" blur that
// UIKit bars use; on Android a frosted translucent fill.
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";

function canUseLiquidGlass() {
  try {
    return Platform.OS === "ios" && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}
const LIQUID = canUseLiquidGlass();

/** Respect "Reduce Transparency": swap glass for a solid surface. */
function useReduceTransparency() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled?.().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

export function Glass({
  children,
  style,
  radius = 22,
  intensity = 60,
  interactive = false,
  tint,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
  interactive?: boolean;
  tint?: string;
}) {
  const reduce = useReduceTransparency();
  const shape = { borderRadius: radius, overflow: "hidden" as const };

  if (reduce) {
    return <View style={[shape, styles.solid, style]}>{children}</View>;
  }
  if (LIQUID) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} tintColor={tint} colorScheme="light" style={[shape, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[shape, styles.edge, style]}>
      <BlurView
        intensity={intensity}
        tint="systemThinMaterialLight"
        blurMethod="dimezisBlurViewSdk31Plus"
        style={StyleSheet.absoluteFill}
      />
      {/* Specular sheen along the top edge, like UIKit materials. */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.12)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.12 }]} /> : null}
      {children}
    </View>
  );
}

/** The soft lavender field glass sits on - same palette as the website's
 * auth pages, so the frosting has colour to pick up. */
export function Backdrop({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#f3f1ff", "#fbfaff", "#eef0ff"]} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.blob, { top: -120, left: -100, backgroundColor: "#a6a9f7", opacity: 0.45 }]} />
      <View pointerEvents="none" style={[styles.blob, { top: 220, right: -150, backgroundColor: "#c9b8ff", opacity: 0.35 }]} />
      <View pointerEvents="none" style={[styles.blob, { bottom: -140, left: -40, backgroundColor: "#f0c9ff", opacity: 0.35 }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  solid: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e2e8f0" },
  edge: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.25)",
  },
  blob: { position: "absolute", width: 380, height: 380, borderRadius: 190 },
});
