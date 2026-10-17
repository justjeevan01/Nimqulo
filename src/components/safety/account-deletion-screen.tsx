import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Panel,
  icons,
  type,
  ui,
  useSocialLayout,
} from "@/components/social/social-ui";
import { Sheet } from "@/components/community/sheet";
import {
  SafetyBack,
  SafetyButton,
  SafetyCanvas,
  SafetyLink,
  SafetyScroll,
  safetyIcons,
} from "./safety-ui";

const consequences = [
  [
    "Your account will be permanently deleted",
    "Your profile, settings, and personal information will be removed.",
    "remove",
  ],
  [
    "All conversations will be deleted",
    "Your direct messages and group conversations cannot be recovered.",
    "chat",
  ],
  [
    "You’ll lose access to all groups",
    "You will be removed from any groups you’ve joined.",
    "people",
  ],
  [
    "Your username will be released",
    "Your username may become available to others after 30 days.",
    "block",
  ],
] as const;
export function AccountDeletionScreen({
  onBack,
  onDelete,
  preview = false,
}: {
  onBack: () => void;
  onDelete?: () => Promise<void>;
  preview?: boolean;
}) {
  const l = useSocialLayout();
  const { s } = l;
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  if (!l.ready) return <View style={ui.root} />;
  async function remove() {
    if (pending.current || !onDelete || value !== "DELETE") return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await onDelete();
      setDone(true);
    } catch {
      setError("Could not delete your account. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <SafetyCanvas deletion>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <SafetyScroll l={l}>
          <View
            style={{
              paddingTop: Math.max(l.insets.top + 8 * s, 43 * s),
              marginLeft: -15 * s,
              transform: [{ translateY: -8 * s }],
            }}
          >
            <SafetyBack l={l} onPress={onBack} plain />
          </View>
          <Image
            source={require("../../../assets/safety/delete.png")}
            style={{
              width: 140 * s,
              height: 137 * s,
              alignSelf: "center",
              marginTop: -54 * s,
              transform: [{ translateY: 11 * s }],
              opacity: 0.75,
            }}
            accessible={false}
          />
          <Text
            accessibilityRole="header"
            style={[
              type(l, 29, "700", "white"),
              { textAlign: "center", marginTop: 1 * s, letterSpacing: -1 * s },
            ]}
          >
            Delete your account?
          </Text>
          <Text
            style={[
              type(l, 14, "400", "#A8BAE5"),
              {
                lineHeight: 20 * s,
                textAlign: "center",
                marginTop: 9 * s,
                marginBottom: 14 * s,
              },
            ]}
          >
            This action is permanent and cannot{"\n"}be undone. All of your data
            will be{"\n"}permanently removed from Nimqulo.
          </Text>
          <Panel style={{ borderRadius: 18 * s, paddingHorizontal: 16 * s }}>
            {consequences.map(([title, body, icon], i) => (
              <View
                key={title}
                style={{
                  flexDirection: "row",
                  gap: 22 * s,
                  paddingVertical: 13.625 * s,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: "#16273C",
                }}
              >
                <View
                  style={{
                    width: 37 * s,
                    height: 37 * s,
                    borderRadius: 20 * s,
                    backgroundColor: "#331927",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    source={
                      icon === "remove"
                        ? safetyIcons.deleteUser
                        : icon === "chat"
                          ? safetyIcons.deleteChat
                          : icon === "block"
                            ? safetyIcons.link
                            : icons[icon]
                    }
                    tintColor="#FF4356"
                    style={{ width: 21 * s, height: 21 * s }}
                    accessible={false}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 * s }}>
                  <Text style={type(l, 11.5, "600", "white")}>{title}</Text>
                  <Text
                    style={[
                      type(l, 10.5, "400", "#9FAFD2"),
                      { lineHeight: 14 * s },
                    ]}
                  >
                    {body}
                  </Text>
                </View>
              </View>
            ))}
          </Panel>
          <Text
            style={[
              type(l, 11, "400", "#B8C7E6"),
              { marginTop: 16 * s, marginBottom: 5 * s },
            ]}
          >
            Type DELETE to confirm
          </Text>
          <TextInput
            accessibilityLabel="Type DELETE to confirm"
            value={value}
            onChangeText={setValue}
            placeholder="Type DELETE"
            placeholderTextColor="#64728D"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
            style={[
              type(l, 13),
              {
                minHeight: 40 * s,
                borderWidth: 1,
                borderColor: "#7B8BAE",
                borderRadius: 12 * s,
                paddingHorizontal: 14 * s,
                backgroundColor: "#0B1829",
              },
            ]}
          />
          <SafetyButton
            l={l}
            label="Delete my account"
            textSize={13.5}
            danger
            disabled={value !== "DELETE" || busy}
            onPress={() => {
              Keyboard.dismiss();
              setConfirm(true);
            }}
            style={{
              minHeight: 43 * s,
              borderRadius: 13 * s,
              marginTop: 13 * s,
            }}
          />
          <View style={{ marginTop: -6 * s }}>
            <SafetyLink l={l} label="Cancel" onPress={onBack} />
          </View>
        </SafetyScroll>
      </KeyboardAvoidingView>
      <Sheet
        title={
          done
            ? preview
              ? "Preview complete"
              : "Account deleted"
            : "Permanently delete account?"
        }
        visible={confirm}
        onClose={() => {
          if (!busy) {
            setConfirm(false);
            if (done) onBack();
          }
        }}
        l={l}
      >
        {done ? (
          <Text style={type(l, 16)}>
            {preview
              ? "This preview is complete. Your account has not been deleted."
              : "Your account has been deleted."}
          </Text>
        ) : (
          <>
            <Text style={type(l, 16)}>This action cannot be undone.</Text>
            {!!error && (
              <Text
                accessibilityRole="alert"
                style={type(l, 14, "400", "#FF929C")}
              >
                {error}
              </Text>
            )}
            {!onDelete && (
              <Text style={type(l, 14, "400", "#A7BDEB")}>
                Account deletion will be available when the account data service
                is connected.
              </Text>
            )}
            <SafetyButton
              l={l}
              label={busy ? "Deleting..." : "Confirm permanent deletion"}
              danger
              disabled={busy || !onDelete}
              onPress={() => {
                void remove();
              }}
            />
          </>
        )}
      </Sheet>
    </SafetyCanvas>
  );
}
