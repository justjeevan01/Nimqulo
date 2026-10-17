import { useState } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import {
  Panel,
  type,
  ui,
  useSocialLayout,
} from "@/components/social/social-ui";
import { Sheet } from "@/components/community/sheet";
import {
  SafetyBack,
  SafetyButton,
  SafetyCanvas,
  SafetyScroll,
  safetyIcons,
} from "./safety-ui";

const reasons = [
  ["Harassment", "Bullying, threats, or hateful behavior"],
  ["Inappropriate content", "Nudity, explicit content, or illegal content"],
  ["Spam", "Unwanted messages or repetitive content"],
  ["Impersonation", "Pretending to be someone else"],
  ["Safety concern", "Behavior that puts others at risk"],
  ["Other", "A different issue not listed above"],
] as const;
export function ReportUserScreen({
  onBack,
  onReport,
  personName,
  preview = false,
}: {
  onBack: () => void;
  onReport?: (reason: string) => boolean;
  personName?: string;
  preview?: boolean;
}) {
  const l = useSocialLayout();
  const { s } = l;
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  if (!l.ready) return <View style={ui.root} />;
  return (
    <SafetyCanvas>
      <SafetyScroll l={l}>
        <View
          style={{
            paddingTop: Math.max(l.insets.top + 8 * s, 56 * s),
            marginLeft: -4 * s,
          }}
        >
          <SafetyBack l={l} onPress={onBack} />
        </View>
        <Text
          accessibilityRole="header"
          style={[
            type(l, 30, "700", "white"),
            { textAlign: "center", marginTop: 8 * s },
          ]}
        >
          Report User
        </Text>
        <Text
          style={[
            type(l, 16, "400", "#A5BAF4"),
            { textAlign: "center", marginTop: 7 * s, marginBottom: 11 * s },
          ]}
        >
          Select a reason
        </Text>
        <Panel
          style={{
            marginHorizontal: -4 * s,
            padding: 10 * s,
            gap: 8 * s,
            borderRadius: 18 * s,
          }}
        >
          {reasons.map(([title, subtitle]) => (
            <Pressable
              key={title}
              accessibilityRole="radio"
              accessibilityLabel={title}
              accessibilityState={{ checked: reason === title }}
              aria-checked={reason === title}
              onPress={() => setReason(title)}
              style={{
                minHeight: 57 * s,
                borderRadius: 13 * s,
                borderWidth: 1,
                borderColor: reason === title ? "#448CFF" : "#1B3655",
                backgroundColor: "#0B1929",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 17 * s,
                gap: 19 * s,
                paddingVertical: 9 * s,
              }}
            >
              <View
                style={{
                  width: 21 * s,
                  height: 21 * s,
                  borderRadius: 12 * s,
                  borderWidth: 2,
                  borderColor: "#B8C9F5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {reason === title && (
                  <View
                    style={{
                      width: 11 * s,
                      height: 11 * s,
                      borderRadius: 7 * s,
                      backgroundColor: "#3D99FF",
                    }}
                  />
                )}
              </View>
              <View style={{ flex: 1, gap: 5 * s }}>
                <Text style={type(l, 15.5, "500", "white")}>{title}</Text>
                <Text style={type(l, 11.5, "400", "#A7BDEB")}>{subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </Panel>
        <Panel
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 13.5 * s,
            paddingHorizontal: 20 * s,
            gap: 14 * s,
            marginHorizontal: -2 * s,
            marginTop: 11 * s,
            borderRadius: 18 * s,
          }}
        >
          <View
            style={{
              width: 40 * s,
              height: 40 * s,
              borderRadius: 22 * s,
              backgroundColor: "#102A46",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={safetyIcons.shield}
              style={{ width: 24 * s, height: 24 * s }}
              accessible={false}
            />
          </View>
          <Text
            style={[
              type(l, 12, "400", "#A7BDEB"),
              { flex: 1, lineHeight: 17 * s },
            ]}
          >
            Reports are reviewed by our moderation team. If this is an
            emergency, please contact local authorities.
          </Text>
        </Panel>
        <SafetyButton
          l={l}
          label="Continue"
          disabled={!reason}
          onPress={() => {
            setError("");
            setConfirm(true);
          }}
          style={{
            marginHorizontal: -2 * s,
            marginTop: 15 * s,
            minHeight: 48 * s,
          }}
        />
      </SafetyScroll>
      <Sheet
        visible={confirm}
        title={saved ? "Report recorded" : "Submit report?"}
        onClose={() => {
          setConfirm(false);
          if (saved) onBack();
        }}
        l={l}
      >
        {saved ? (
          <Text style={type(l, 16)}>
            {preview
              ? "Report saved for this preview."
              : "Your report has been submitted."}
          </Text>
        ) : (
          <>
            <Text style={type(l, 16)}>
              {personName
                ? `Report ${personName} for ${reason.toLowerCase()}?`
                : `Selected reason: ${reason}`}
            </Text>
            {!!error && (
              <Text
                accessibilityRole="alert"
                style={type(l, 14, "400", "#FF929C")}
              >
                {error}
              </Text>
            )}
            <SafetyButton
              l={l}
              label="Submit report"
              disabled={!onReport}
              onPress={() => {
                if (onReport?.(reason) === true) setSaved(true);
                else
                  setError("Could not record this report. Please try again.");
              }}
            />
            {!onReport && (
              <Text style={type(l, 14, "400", "#A7BDEB")}>
                Reporting will be available when the moderation service is
                connected.
              </Text>
            )}
          </>
        )}
      </Sheet>
    </SafetyCanvas>
  );
}
