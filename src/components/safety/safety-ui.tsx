import { Image } from "expo-image";
import type { PropsWithChildren } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import {
  icons,
  type,
  ui,
  type SocialLayout,
} from "@/components/social/social-ui";
import { svgSource } from "@/lib/svg";

export const safetyIcons = {
  support: svgSource(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M4 14v-3a8 8 0 0 1 16 0v6c0 4-3 5-7 5"/><rect x="2" y="12" width="5" height="8" rx="2" fill="white"/><rect x="17" y="12" width="5" height="8" rx="2" fill="white"/></svg>',
  ),
  deleteUser: svgSource(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF4356"><circle cx="12" cy="6" r="4"/><path d="M4 23v-5a8 8 0 0 1 16 0v5Z"/></svg>',
  ),
  deleteChat: svgSource(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF4356"><path d="M3 3h18v15H9l-6 4Z"/><path d="M7 7h10M7 11h8" stroke="#6D1725" stroke-width="2"/></svg>',
  ),
  link: svgSource(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FF4356" stroke-width="2" stroke-linecap="round"><path d="m10 7 3-3a5 5 0 0 1 7 7l-4 4a5 5 0 0 1-7 0M14 17l-3 3a5 5 0 0 1-7-7l4-4a5 5 0 0 1 7 0"/></svg>',
  ),
  retry: svgSource(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8A9 9 0 0 0 4 6L2 9m0-7v7h7M4 16a9 9 0 0 0 16 2l2-3m0 7v-7h-7"/></svg>',
  ),
  lock: svgSource(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#A4B9EC" stroke-width="1.8"><rect x="4" y="10" width="16" height="12" rx="3"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>',
  ),
  shield: svgSource(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#B8CCFA" stroke-width="2" stroke-linejoin="round"><path d="m12 2 9 4v7c0 5-9 9-9 9S3 18 3 13V6Z"/></svg>',
  ),
};
const button = svgSource(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 60"><defs><linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0" stop-color="#47B6FF"/><stop offset=".12" stop-color="#118EFF"/><stop offset=".5" stop-color="#0063FF"/><stop offset=".85" stop-color="#0051FF"/><stop offset="1" stop-color="#087BFF"/></linearGradient></defs><rect width="360" height="60" rx="29" fill="url(#b)"/><rect x="1" y="1" width="358" height="58" rx="28" fill="none" stroke="#6AC4FF" stroke-opacity=".5"/></svg>',
);
type Backdrop = "report" | "deletion" | "suspended" | "session" | "offline";
function background(kind: Backdrop) {
  const deletion = kind === "deletion";
  const suspended = kind === "suspended";
  const top =
    deletion || suspended
      ? `M0 0H390V${suspended ? 166 : 125}C308 145 262 42 155 35L0 15Z`
      : "M0 0H390V40C300 165 216 28 0 20Z";
  const left =
    kind === "session"
      ? "M0 285C75 250 95 205 180 204L0 430Z"
      : `M0 ${deletion ? 240 : suspended ? 245 : 300}c75 14 103 127 197 140L0 650Z`;
  const rightY = kind === "offline" ? 525 : kind === "session" ? 475 : 495;
  const lower = `M390 ${rightY}C275 ${rightY + 67} 250 668 0 755V787H390Z`;
  const topEdge =
    deletion || suspended
      ? `M155 35C262 42 308 145 390 ${suspended ? 166 : 125}`
      : "M0 20C216 28 300 165 390 40";
  const edges = [
    topEdge,
    ...(deletion || kind === "report"
      ? []
      : [`M390 ${rightY}C275 ${rightY + 67} 250 668 0 755`]),
  ];
  const glow = edges
    .map((d) =>
      [24, 12, 4, 0.5]
        .map(
          (width, i) =>
            `<path d="${d}" fill="none" stroke="#0060FF" stroke-width="${width}" opacity="${[0.018, 0.035, 0.07, 0.5][i]}"/>`,
        )
        .join(""),
    )
    .join("");
  return svgSource(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 787"><defs><radialGradient id="t" gradientUnits="userSpaceOnUse" cx="310" cy="86" r="245"><stop stop-color="#00236E"/><stop offset=".22" stop-color="#001943"/><stop offset="1" stop-color="#020D1A"/></radialGradient><radialGradient id="l" gradientUnits="userSpaceOnUse" cx="0" cy="${deletion ? 240 : suspended ? 245 : kind === "session" ? 285 : 300}" r="190"><stop stop-color="#003B9C"/><stop offset=".2" stop-color="#001D52"/><stop offset=".85" stop-color="#020D1A"/></radialGradient><radialGradient id="r" gradientUnits="userSpaceOnUse" cx="390" cy="${rightY}" r="300"><stop stop-color="#003C9D"/><stop offset=".17" stop-color="#001C50"/><stop offset=".8" stop-color="#020D1A"/></radialGradient><radialGradient id="b" gradientUnits="userSpaceOnUse" cx="0" cy="755" r="260"><stop stop-color="#0043A9"/><stop offset=".2" stop-color="#001E58"/><stop offset="1" stop-color="#020D1A" stop-opacity="0"/></radialGradient></defs><rect width="390" height="787" fill="#020D1A"/><path d="${top}" fill="url(#t)"/><path d="${left}" fill="url(#l)"/>${deletion || kind === "report" ? "" : `<path d="${lower}" fill="url(#r)"/><path d="${lower}" fill="url(#b)"/>`}${glow}</svg>`,
  );
}
const backdrops = {
  report: background("report"),
  deletion: background("deletion"),
  suspended: background("suspended"),
  session: background("session"),
  offline: background("offline"),
};
export function SafetyCanvas({
  children,
  deletion = false,
  variant,
}: PropsWithChildren<{ deletion?: boolean; variant?: Backdrop }>) {
  return (
    <View style={ui.root}>
      <View style={ui.canvas}>
        <Image
          source={backdrops[variant || (deletion ? "deletion" : "report")]}
          style={StyleSheet.absoluteFill}
          contentFit="fill"
          accessible={false}
        />
        {children}
      </View>
    </View>
  );
}
export function SafetyScroll({
  children,
  l,
}: PropsWithChildren<{ l: SocialLayout }>) {
  return (
    <ScrollView
      bounces={false}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 16 * l.s,
        paddingBottom: Math.max(l.insets.bottom + 18 * l.s, 28 * l.s),
      }}
    >
      {children}
    </ScrollView>
  );
}
export function SafetyButton({
  label,
  onPress,
  disabled = false,
  danger = false,
  icon,
  l,
  style,
  textSize = 17,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: keyof typeof safetyIcons;
  l: SocialLayout;
  style?: ViewStyle;
  textSize?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || !onPress }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 58 * l.s,
          borderRadius: 26 * l.s,
          borderWidth: 1,
          borderColor: danger ? "#DF3544" : "#4CADFF",
          backgroundColor: danger ? "#C72530" : "#0067FF",
          overflow: "hidden",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 13 * l.s,
          boxShadow: danger ? undefined : "0 5px 23px #0055FF50",
          opacity: pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      {!danger && (
        <Image
          source={button}
          style={StyleSheet.absoluteFill}
          contentFit="fill"
          accessible={false}
        />
      )}
      {!!icon && (
        <Image
          source={safetyIcons[icon]}
          style={{ width: 23 * l.s, height: 23 * l.s }}
          accessible={false}
        />
      )}
      <Text style={type(l, textSize, "500", "white")}>{label}</Text>
    </Pressable>
  );
}
export function SafetyLink({
  label,
  onPress,
  l,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  l: SocialLayout;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 48 * l.s,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8 * l.s,
      }}
    >
      <Text style={type(l, 16, "500", "#1689FF")}>{label}</Text>
    </Pressable>
  );
}

export function SafetyBack({
  l,
  onPress,
  plain = false,
}: {
  l: SocialLayout;
  onPress: () => void;
  plain?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress}
      style={{
        width: 44 * l.s,
        height: 44 * l.s,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 36 * l.s,
          height: 36 * l.s,
          borderRadius: 22 * l.s,
          borderWidth: plain ? 0 : 1,
          borderColor: "#23416B",
          backgroundColor: plain ? "transparent" : "#0A182A",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={icons.chevron}
          tintColor="#DCE8FF"
          style={{
            width: 22 * l.s,
            height: 22 * l.s,
            transform: [{ rotate: "180deg" }],
          }}
          accessible={false}
        />
      </View>
    </Pressable>
  );
}
