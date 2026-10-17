import { useFonts } from "expo-font";
import { Image, type ImageProps } from "expo-image";
import { useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { svgSource } from "@/lib/svg";

const svg = (body: string, viewBox = "0 0 24 24") => svgSource(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`);
const arrow = svg('<path d="M19 12H5m7-7-7 7 7 7" fill="none" stroke="#D7E3FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
const camera = svg('<path d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="white"/><circle cx="12" cy="12.5" r="5" fill="#0961FF"/><circle cx="12" cy="12.5" r="3.2" fill="white"/><circle cx="19" cy="8" r="1" fill="#0961FF"/>');
const gradient = svg('<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#0751E9"/><stop offset=".6" stop-color="#1768FF"/><stop offset="1" stop-color="#4DA5FF"/></linearGradient></defs><rect x=".5" y=".5" width="345" height="51" rx="25.5" fill="url(#g)" stroke="#69B4FF" stroke-width="1"/>', "0 0 346 52");
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

type Props = {
  initialImageSource?: ImageProps["source"];
  onConfirm: () => void;
  onBack: () => Promise<void>;
};

export function ProfileSetupScreen({ initialImageSource, onConfirm, onBack }: Props) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [fontsLoaded, fontError] = useFonts({ Inter: require("../../../assets/fonts/Inter.ttf") });
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [busy, setBusy] = useState<"back" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const screenWidth = Math.min(width, 480);
  const scale = screenWidth / 390;
  const canvasHeight = Math.max(height, 753 * scale);
  const largeText = fontScale > 1.2;
  const fontFamily = fontsLoaded ? "Inter" : undefined;

  async function goBack() {
    if (pending.current) return;
    pending.current = true;
    setBusy("back");
    setError(null);
    try { await onBack(); }
    catch { setError("We couldn’t go back. Please try again."); }
    finally { pending.current = false; setBusy(null); }
  }

  if (!mounted || (!fontsLoaded && !fontError)) return <View style={styles.root} />;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.canvas, { width: screenWidth, minHeight: canvasHeight, paddingBottom: Math.max(insets.bottom + 24, 52 * scale) }]}>
          <Image source={require("../../../assets/profile/background.png")} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={!!busy} onPress={goBack} style={({ pressed }) => [styles.back, { left: 16 * scale, top: Math.max(insets.top + 8, canvasHeight * 0.066), width: Math.max(44, 48 * scale), height: Math.max(44, 48 * scale) }, pressed && styles.pressed]}>
            {busy === "back" ? <ActivityIndicator color="#D7E3FF" /> : <Image source={arrow} style={{ width: 25 * scale, height: 25 * scale }} accessible={false} />}
          </Pressable>
          <View style={[styles.heading, { marginTop: canvasHeight * 0.145, paddingHorizontal: 20 * scale }]}>
            <Text accessibilityRole="header" style={[styles.title, { fontFamily, fontSize: 27 * scale, lineHeight: 35 * scale }]}>Build your profile</Text>
            <Text style={[styles.subtitle, { fontFamily, fontSize: 18 * scale, lineHeight: 22 * scale, marginTop: 6 * scale }]}>This helps your connections{"\n"}recognize you.</Text>
          </View>
          <View style={[styles.avatarSection, { marginTop: largeText ? 28 * scale : Math.max(20 * scale, canvasHeight * 0.284 - canvasHeight * 0.145 - 85 * scale) }]}>
            <View style={[styles.avatarRing, { width: 175 * scale, height: 175 * scale, padding: 7 * scale }]}>
              {initialImageSource ? <Image source={initialImageSource} style={styles.avatar} contentFit="cover" accessibilityLabel="Profile photo" /> : <View style={styles.emptyAvatar}><Text style={[styles.initials, { fontFamily, fontSize: 55 * scale }]}>+</Text></View>}
            </View>
            <View style={[styles.camera, { width: 55 * scale, height: 55 * scale, right: -2 * scale, bottom: 4 * scale }]}>
              <Image source={camera} style={{ width: 25 * scale, height: 25 * scale }} accessible={false} />
            </View>
          </View>
          <View style={[styles.form, { paddingHorizontal: 22 * scale, marginTop: Math.max(largeText ? 28 * scale : 22 * scale, canvasHeight * 0.546 - canvasHeight * 0.284 - 175 * scale) }]}>
            <Text nativeID="display-name-label" style={[styles.label, { fontFamily, fontSize: 17 * scale, lineHeight: 23 * scale, marginLeft: 7 * scale }]}>Display name</Text>
            <TextInput accessibilityLabel="Display name" accessibilityLabelledBy="display-name-label" value="" editable={false} accessibilityState={{ disabled: true }} placeholder="Your display name" placeholderTextColor="#7188B0" style={[styles.input, { fontFamily, fontSize: 20 * scale, minHeight: 53 * scale * Math.max(1, fontScale), borderRadius: 26 * scale, paddingHorizontal: 26 * scale, marginTop: 5 * scale }]} />
            <Text nativeID="username-label" style={[styles.label, { fontFamily, fontSize: 17 * scale, lineHeight: 23 * scale, marginTop: 19 * scale, marginLeft: 7 * scale }]}>Username</Text>
            <View style={[styles.usernameField, { minHeight: 53 * scale * Math.max(1, fontScale), borderRadius: 26 * scale, marginTop: 5 * scale }]}>
              <TextInput accessibilityLabel="Username" accessibilityLabelledBy="username-label" accessibilityState={{ disabled: true }} value="" editable={false} placeholder="Choose a username" placeholderTextColor="#7188B0" style={[styles.usernameInput, { fontFamily, fontSize: 20 * scale, minHeight: 51 * scale * Math.max(1, fontScale), paddingLeft: 26 * scale, paddingRight: 26 * scale }]} />
            </View>
            <Text style={[styles.helper, { fontFamily, fontSize: 13 * scale, lineHeight: 18 * scale, marginTop: 7 * scale, marginLeft: 7 * scale }]}>You can add your details later.</Text>
            {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.error, { fontFamily }]}>{error}</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel="Confirm" accessibilityState={{ disabled: !!busy }} disabled={!!busy} onPress={onConfirm} style={({ pressed }) => [styles.continue, { height: 52 * scale, borderRadius: 26 * scale, marginTop: 25 * scale }, pressed && styles.pressed]}>
              <Image source={gradient} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
              <Text style={[styles.continueLabel, { fontFamily, fontSize: 20 * scale }]}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020B18" },
  scroll: { flexGrow: 1, alignItems: "center" },
  canvas: { position: "relative", backgroundColor: "#020B18" },
  tint: { backgroundColor: "rgba(0, 5, 12, 0.24)" },
  back: { position: "absolute", zIndex: 1, borderRadius: 99, borderColor: "#243D6A", borderWidth: 1, backgroundColor: "rgba(9, 23, 47, .62)", justifyContent: "center", alignItems: "center" },
  heading: { alignItems: "center" },
  title: { color: "#FFFFFF", fontWeight: "700", letterSpacing: -0.7, textAlign: "center" },
  subtitle: { color: "#8198CA", textAlign: "center", fontWeight: "400", letterSpacing: -0.3 },
  avatarSection: { alignSelf: "center", position: "relative" },
  avatarRing: { borderRadius: 999, borderWidth: 1, borderColor: "#23477F", backgroundColor: "rgba(9, 31, 67, .65)" },
  avatar: { width: "100%", height: "100%", borderRadius: 999 },
  emptyAvatar: { flex: 1, borderRadius: 999, backgroundColor: "#142D52", justifyContent: "center", alignItems: "center" },
  initials: { color: "#B5CCF8", fontWeight: "500" },
  camera: { position: "absolute", borderRadius: 99, borderWidth: 1.5, borderColor: "#74AFFF", backgroundColor: "#0759FF", justifyContent: "center", alignItems: "center", boxShadow: "inset 1px 1px 5px rgba(75, 169, 255, .4)" },
  form: { width: "100%" },
  label: { color: "#DBE5FC", fontWeight: "500" },
  input: { color: "#FFFFFF", backgroundColor: "rgba(10, 22, 44, .72)", borderColor: "#2B426C", borderWidth: 1.1, paddingVertical: 9 },
  usernameField: { backgroundColor: "rgba(10, 22, 44, .72)", borderColor: "#2B426C", borderWidth: 1.1, justifyContent: "center" },
  usernameInput: { color: "#FFFFFF", paddingVertical: 9, borderRadius: 99 },
  helper: { color: "#728DBC" },
  error: { color: "#FFB0BB", fontSize: 13, lineHeight: 19, marginTop: 12, marginHorizontal: 7 },
  continue: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#1264FF" },
  continueLabel: { color: "#FFFFFF", fontWeight: "500", letterSpacing: 0.1 },
  pressed: { opacity: 0.75 },
});
