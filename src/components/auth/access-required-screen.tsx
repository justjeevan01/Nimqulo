import { useAuth, useClerk } from "@clerk/expo";
import { useFonts } from "expo-font";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { svgSource } from "@/lib/svg";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const buttonGradient = svgSource('<svg xmlns="http://www.w3.org/2000/svg" width="328" height="59" viewBox="0 0 328 59"><defs><linearGradient id="g" x2="0.05" y2="1"><stop stop-color="#119AFF"/><stop offset="0.22" stop-color="#087BFF"/><stop offset="1" stop-color="#0053FF"/></linearGradient></defs><rect width="328" height="59" rx="26" fill="url(#g)"/></svg>');
const supportIcon = svgSource('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 13v-2a8 8 0 0 1 16 0v6c0 3-2 5-5 5h-3" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/><rect x="2" y="12" width="5" height="9" rx="2" fill="white"/><rect x="17" y="12" width="5" height="9" rx="2" fill="white"/><path d="M11 22h3" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>');

export function AccessRequiredScreen() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [fontsLoaded, fontError] = useFonts({ Inter: require("../../../assets/fonts/Inter.ttf") });
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [busy, setBusy] = useState<"support" | "return" | null>(null);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const screenWidth = Math.min(width, 480);
  const scale = screenWidth / 390;
  const screenHeight = Math.max(height, 740 * scale * Math.min(fontScale, 1.5));
  const fontFamily = fontsLoaded ? "Inter" : undefined;

  async function runAction(action: "support" | "return") {
    if (pending.current || (action === "return" && !isLoaded)) return;
    pending.current = true;
    setBusy(action);
    setError(null);
    try {
      if (action === "support") {
        await Linking.openURL("mailto:jeevanofficial1120@gmail.com?subject=Nimqulo%20account%20access");
      } else {
        if (isSignedIn) await signOut();
        router.replace("/");
      }
    } catch {
      setError(action === "support" ? "Email us at jeevanofficial1120@gmail.com for help with access." : "We couldn’t sign you out. Please try again.");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }

  if (!mounted || (!fontsLoaded && !fontError)) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.screen, { width: screenWidth, height: screenHeight }]}>
          <Image source={require("../../../assets/access/background.svg")} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
          <View style={[styles.illustration, { top: Math.max(insets.top + 24, screenHeight * 0.174) }]}>
            <Image source={require("../../../assets/access/lock.svg")} style={{ width: 192 * scale, height: 192 * scale }} contentFit="contain" accessible={false} />
          </View>
          <View style={[styles.copy, { top: screenHeight * 0.445, paddingHorizontal: 20 * scale }]}>
            <Text accessibilityRole="header" style={[styles.title, { fontFamily, fontSize: 31.5 * scale, lineHeight: 40 * scale }]}>Not approved yet</Text>
            <Text style={[styles.body, { fontFamily, fontSize: 17 * scale, lineHeight: 23 * scale, marginTop: 14 * scale }]}>Your account is not yet approved{"\n"}for Nimqulo.</Text>
          </View>
          <View style={[styles.actions, { top: screenHeight * 0.734, paddingHorizontal: 31 * scale }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Contact Support" accessibilityHint="Open your email app to contact Nimqulo support" accessibilityState={{ disabled: !!busy, busy: busy === "support" }} disabled={!!busy} onPress={() => runAction("support")}
              style={({ pressed }) => [styles.supportButton, { height: 59 * scale, borderRadius: 26 * scale, gap: 16 * scale }, pressed && styles.pressed]}>
              <Image source={buttonGradient} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
              {busy === "support" ? <ActivityIndicator color="#FFFFFF" /> : <Image source={supportIcon} style={{ width: 25 * scale, height: 25 * scale }} accessible={false} />}
              <Text style={[styles.supportLabel, { fontFamily, fontSize: 17 * scale }]}>Contact Support</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Return to Sign In" accessibilityState={{ disabled: !!busy || !isLoaded, busy: busy === "return" }} disabled={!!busy || !isLoaded} onPress={() => runAction("return")}
              style={({ pressed }) => [styles.returnButton, { marginTop: 7 * scale }, pressed && styles.pressed]}>
              {busy === "return" ? <ActivityIndicator color="#008BFF" /> : <Text style={[styles.returnLabel, { fontFamily, fontSize: 17 * scale }]}>Return to Sign In</Text>}
            </Pressable>
          </View>
          {error && <View style={[styles.errorPanel, { bottom: Math.max(insets.bottom + 16, 20) }]}><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text></View>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020B18" },
  scroll: { flexGrow: 1, alignItems: "center" },
  screen: { position: "relative", overflow: "hidden", backgroundColor: "#020B18" },
  illustration: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  copy: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  title: { color: "#FFFFFF", fontWeight: "700", letterSpacing: -0.7, textAlign: "center" },
  body: { color: "#A0B4DC", fontWeight: "400", textAlign: "center", letterSpacing: 0.1 },
  actions: { position: "absolute", left: 0, right: 0 },
  supportButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderColor: "#56B9FF", borderWidth: 0.8, backgroundColor: "#0069FF", boxShadow: "0 7px 22px rgba(0, 87, 255, 0.32), inset 0 1px 1px rgba(180, 230, 255, 0.45)" },
  supportLabel: { color: "#FFFFFF", fontWeight: "500", letterSpacing: 0.1 },
  returnButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  returnLabel: { color: "#008BFF", fontWeight: "500" },
  pressed: { opacity: 0.75 },
  errorPanel: { position: "absolute", left: 24, right: 24, borderRadius: 12, padding: 12, backgroundColor: "rgba(2, 11, 24, 0.95)" },
  error: { color: "#C4D2EB", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
