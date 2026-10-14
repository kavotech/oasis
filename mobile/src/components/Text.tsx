// App-wide typography: Grenette Pro, the same face the website uses for
// everything (styles/globals.css). Import Text/TextInput from here instead
// of "react-native" so every string picks it up.
import { forwardRef } from "react";
import { Platform, StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from "react-native";

export const FONT_REGULAR = "GrenettePro";
export const FONT_ITALIC = "GrenettePro-Italic";

/** Grenette ships one weight (as on the website, where the browser
 * synthesises bold). Android fakes bold from fontWeight; iOS won't, so heavy
 * weights get a hairline stroke-like shadow to keep headings punchy. */
function fontStyle(style: TextProps["style"]): TextStyle {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const family = flat.fontStyle === "italic" ? FONT_ITALIC : FONT_REGULAR;
  const weight = Number(flat.fontWeight ?? 400);
  const extra: TextStyle = { fontFamily: flat.fontFamily ?? family };
  if (Platform.OS === "ios" && weight >= 600 && !flat.textShadowColor) {
    extra.textShadowColor = (flat.color as string) ?? "#0f172a";
    extra.textShadowOffset = { width: weight >= 700 ? 0.35 : 0.2, height: 0 };
    extra.textShadowRadius = 0.01;
  }
  return extra;
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={[style, fontStyle(style)]} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={[style, { fontFamily: FONT_REGULAR }]} />;
});
