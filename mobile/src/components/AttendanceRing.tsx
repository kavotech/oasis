import { View } from "react-native";
import { Text } from "@/components/Text";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/theme";

type Segment = { value: number; color: string };

/** Apple Activity-style ring: one arc per segment, percentage in the middle. */
export function AttendanceRing({ segments, size = 128, stroke = 14, centerLabel, centerSub }: { segments: Segment[]; size?: number; stroke?: number; centerLabel: string; centerSub: string }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(148,152,239,0.15)" strokeWidth={stroke} fill="none" />
        {total > 0 &&
          segments.map((seg, i) => {
            const len = (seg.value / total) * circumference;
            const el = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={seg.color}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap={segments.filter((s) => s.value > 0).length === 1 ? "round" : "butt"}
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return seg.value > 0 ? el : null;
          })}
      </Svg>
      <Text style={{ fontSize: 26, fontWeight: "800", letterSpacing: -0.6, color: colors.slate900 }}>{centerLabel}</Text>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.slate500, marginTop: 1 }}>{centerSub}</Text>
    </View>
  );
}
