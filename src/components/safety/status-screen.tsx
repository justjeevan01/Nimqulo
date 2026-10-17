import { Image } from "expo-image";
import { useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { type, ui, useSocialLayout } from "@/components/social/social-ui";
import {
  SafetyButton,
  SafetyCanvas,
  SafetyLink,
  SafetyScroll,
  safetyIcons,
} from "./safety-ui";

type Kind = "suspended" | "session" | "offline";
const content = {
  suspended: {
    art: require("../../../assets/safety/suspended.png"),
    title: "Account suspended",
    body: "Your access to Nimqulo has been\ntemporarily disabled due to a violation\nof our community guidelines or\nsafety policy.",
    extra:
      "If you believe this is a mistake,\nyou can contact our support team\nto review your account.",
    action: "Contact Support",
    secondary: "Return to Sign In",
    icon: "support",
  },
  session: {
    art: require("../../../assets/safety/session.png"),
    title: "You’ve been signed out",
    body: "Your account has been signed in\non another device, so your\ncurrent session has ended.",
    extra: "",
    action: "Sign In Again",
    secondary: "",
    icon: undefined,
  },
  offline: {
    art: require("../../../assets/safety/offline.png"),
    title: "You’re offline",
    body: "We’ll send your messages\nautomatically when you’re back\nonline. Some content may not\nbe available right now.",
    extra: "",
    action: "Try Again",
    secondary: "Go to Settings",
    icon: "retry",
  },
} as const;
export function StatusScreen({
  kind,
  onAction,
  onSecondary,
}: {
  kind: Kind;
  onAction: () => Promise<void>;
  onSecondary?: () => Promise<void>;
}) {
  const l = useSocialLayout();
  const { s } = l;
  const { height } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const c = content[kind];
  if (!l.ready) return <View style={ui.root} />;
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch {
      setError(
        kind === "suspended"
          ? "Email jeevanofficial1120@gmail.com for help."
          : "Could not complete this action. Please try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const suspended = kind === "suspended";
  return (
    <SafetyCanvas
      variant={
        kind === "suspended"
          ? "suspended"
          : kind === "session"
            ? "session"
            : "offline"
      }
    >
      <SafetyScroll l={l}>
        <View
          style={{
            paddingTop: Math.max(
              l.insets.top + 35 * s,
              height * (suspended ? 0.164 : kind === "offline" ? 0.196 : 0.188),
            ),
            alignItems: "center",
          }}
        >
          <Image
            source={c.art}
            style={{
              width: (suspended ? 180 : 195) * s,
              height: (suspended ? 180 : 195) * s,
              transform: [{ translateY: 7 * s }],
              opacity: 0.66,
            }}
            accessible={false}
          />
          <Text
            accessibilityRole="header"
            style={[
              type(
                l,
                suspended ? 30 : kind === "offline" ? 34 : 29,
                "700",
                "white",
              ),
              {
                textAlign: "center",
                letterSpacing: -0.9 * s,
                marginTop: (suspended ? 15 : 22) * s,
              },
            ]}
          >
            {c.title}
          </Text>
          <Text
            style={[
              type(l, 17, "400", "#B4C3E9"),
              { lineHeight: 24 * s, textAlign: "center", marginTop: 17 * s },
            ]}
          >
            {c.body}
          </Text>
          {!!c.extra && (
            <Text
              style={[
                type(l, 15.5, "400", "#A8B9E4"),
                { textAlign: "center", lineHeight: 22 * s, marginTop: 17 * s },
              ]}
            >
              {c.extra}
            </Text>
          )}
        </View>
        <View
          style={{
            paddingHorizontal: kind === "offline" ? 25 * s : 9 * s,
            marginTop: (suspended ? 30 : 45) * s,
          }}
        >
          <SafetyButton
            l={l}
            label={busy ? "Please wait..." : c.action}
            disabled={busy}
            icon={c.icon}
            onPress={() => {
              void run(onAction);
            }}
          />
          {!!c.secondary && onSecondary && (
            <SafetyLink
              l={l}
              label={c.secondary}
              disabled={busy}
              onPress={() => {
                void run(onSecondary);
              }}
            />
          )}
          {kind === "session" && (
            <View
              style={{
                flexDirection: "row",
                gap: 8 * s,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 21 * s,
              }}
            >
              <Image
                source={safetyIcons.lock}
                style={{ width: 18 * s, height: 18 * s }}
                accessible={false}
              />
              <Text style={type(l, 13, "400", "#A3B4DA")}>
                This helps keep your account secure.
              </Text>
            </View>
          )}
        </View>
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={[
              type(l, 14, "400", "#FF9BA4"),
              { textAlign: "center", marginTop: 14 * s },
            ]}
          >
            {error}
          </Text>
        )}
      </SafetyScroll>
    </SafetyCanvas>
  );
}
