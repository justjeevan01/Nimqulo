import { useFonts } from "expo-font";
import { Image } from "expo-image";
import { useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { svgSource } from "@/lib/svg";

const svgImage = (body: string) => svgSource(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`);
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const google = svgImage('<path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.61 4.61 0 0 1-2 3.03v2.52h3.24c1.89-1.74 2.98-4.3 2.98-7.38Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.39l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.93a6 6 0 0 1 0-3.86v-2.6H3.06a10 10 0 0 0 0 9.06l3.34-2.6Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.88-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.47l3.34 2.6C7.19 7.71 9.4 5.95 12 5.95Z"/>');
const arrow = svgImage('<path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="#CFDDF5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
const shield = svgImage('<path d="M12 2.5c2.5 2 5.2 2.8 8 3v6.2c0 5-3.3 8.4-8 10.3-4.7-1.9-8-5.3-8-10.3V5.5c2.8-.2 5.5-1 8-3Z" fill="none" stroke="#28DC85" stroke-width="2"/><path d="m8.5 11.8 2.5 2.5 4.6-5.1" fill="none" stroke="#28DC85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');

type AuthScreenProps = {
  onGoogleSignIn: () => void;
  isReady: boolean;
  isSigningIn: boolean;
  error: string | null;
};

export function AuthScreen({ onGoogleSignIn, isReady, isSigningIn, error }: AuthScreenProps) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [fontsLoaded, fontError] = useFonts({ Inter: require("../../../assets/fonts/Inter.ttf") });
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const screenWidth = Math.min(width, 480);
  const scale = screenWidth / 390;
  // Short screens and larger accessibility text can scroll without clipping content.
  const screenHeight = Math.max(height, 740 * scale * Math.min(fontScale, 1.5));
  const logoScale = Math.min(scale, screenHeight / 1000);
  const fontFamily = fontsLoaded ? "Inter" : undefined;

  // The web server has no viewport. Wait for mount to avoid hydrating zero-sized styles.
  if (!mounted || (!fontsLoaded && !fontError)) return <View style={styles.loading} />;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={[styles.screen, { width: screenWidth, height: screenHeight }]}>
          <Image source={require("../../../assets/auth/background.png")} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backgroundTint]} />
          <View style={[styles.brand, { top: Math.max(insets.top + 40, screenHeight * 0.136) }]}>
            <Image source={require("../../../assets/auth/logo.png")} style={{ width: 112 * logoScale, height: 112 * logoScale }} contentFit="contain" accessible={false} />
            <Text accessibilityRole="header" style={[styles.wordmark, { fontFamily, fontSize: 46 * scale, lineHeight: 60 * scale, marginTop: 7 * scale }]}>Nimqulo</Text>
          </View>
          <View style={[styles.message, { top: screenHeight * 0.345 }]}>
            <Text style={[styles.headline, { fontFamily, fontSize: 33 * scale, lineHeight: 40 * scale }]}>
              Private messaging{"\n"}for{"\u00A0"}<Text style={styles.highlight}>trusted people.</Text>
            </Text>
          </View>
          <View style={[styles.action, { top: screenHeight * 0.724, paddingHorizontal: 22 * scale }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityHint="Sign in to your invite-only Nimqulo account" accessibilityState={{ disabled: !isReady || isSigningIn, busy: isSigningIn }} disabled={!isReady || isSigningIn} onPress={onGoogleSignIn}
              style={({ pressed }) => [styles.googleButton, { height: 78 * logoScale, minHeight: 56, paddingHorizontal: 23 * scale, gap: 18 * scale }, pressed && styles.buttonPressed, (!isReady || isSigningIn) && styles.buttonDisabled]}>
              <Image source={google} style={{ width: 37 * scale, height: 37 * scale }} accessible={false} />
              <Text style={[styles.buttonLabel, { fontFamily, fontSize: 19 * scale, lineHeight: 28 * scale }]}>{isSigningIn ? "Connecting…" : "Continue with Google"}</Text>
              <View style={[styles.arrowCircle, { width: 46 * logoScale, height: 50 * logoScale }]}>
                {isSigningIn ? <ActivityIndicator color="#CFDDF5" /> : <Image source={arrow} style={{ width: 27 * scale, height: 27 * scale }} accessible={false} />}
              </View>
            </Pressable>
            <View nativeID="clerk-captcha" />
          </View>
          {error && (
            <View style={[styles.errorPanel, { top: screenHeight * 0.57, marginHorizontal: 22 * scale }]}>
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice, { fontFamily }]}>{error}</Text>
            </View>
          )}
          <View style={[styles.approval, { bottom: Math.max(insets.bottom + 34, screenHeight * 0.066), gap: 10 * logoScale }]}>
            <View style={[styles.shieldBadge, { width: 45 * logoScale, height: 52 * logoScale }]}>
              <Image source={shield} style={{ width: 25 * scale, height: 29 * scale }} accessible={false} />
            </View>
            <Text style={[styles.approvalLabel, { fontFamily, fontSize: 17 * scale, lineHeight: 25 * scale }]}>Approved users only</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020B18" },
  loading: { flex: 1, backgroundColor: "#020B18" },
  scroll: { flexGrow: 1, alignItems: "center" },
  screen: { position: "relative", overflow: "hidden", backgroundColor: "#020B18" },
  backgroundTint: { backgroundColor: "rgba(2, 9, 20, 0.24)" },
  brand: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  wordmark: { color: "#FFFFFF", fontWeight: "700", letterSpacing: -2.5 },
  message: { position: "absolute", left: 12, right: 12, alignItems: "center" },
  headline: { color: "#FFFFFF", fontWeight: "600", letterSpacing: -1.25, textAlign: "center" },
  highlight: { color: "#008BFF" },
  subtitle: { color: "#A5B6D6", letterSpacing: -0.65, textAlign: "center", fontWeight: "500" },
  action: { position: "absolute", left: 0, right: 0 },
  googleButton: { flexDirection: "row", alignItems: "center", borderRadius: 99, borderWidth: 1.4, borderColor: "#587395", backgroundColor: "rgba(7, 19, 39, 0.76)", boxShadow: "inset 0 0 10px rgba(106, 143, 192, 0.16)" },
  buttonPressed: { backgroundColor: "rgba(28, 53, 86, 0.94)", transform: [{ scale: 0.985 }] },
  buttonDisabled: { opacity: 0.65 },
  buttonLabel: { flex: 1, color: "#FFFFFF", fontWeight: "500", letterSpacing: -0.9 },
  arrowCircle: { backgroundColor: "rgba(67, 90, 133, 0.32)", borderRadius: 99, alignItems: "center", justifyContent: "center", marginRight: -7 },
  approval: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  shieldBadge: { backgroundColor: "rgba(21, 118, 104, 0.22)", borderRadius: 24, alignItems: "center", justifyContent: "center" },
  approvalLabel: { color: "#7F91B5", fontWeight: "500", letterSpacing: -0.7 },
  errorPanel: { position: "absolute", left: 0, right: 0, backgroundColor: "rgba(2, 11, 24, 0.92)", borderRadius: 16, borderWidth: 1, borderColor: "#587395", padding: 12 },
  notice: { color: "#BDCCE4", fontSize: 13, lineHeight: 18, textAlign: "center" },
});
