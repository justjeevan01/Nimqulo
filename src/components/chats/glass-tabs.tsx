import { requireOptionalNativeModule } from "expo";
import { Image } from "expo-image";
import { usePathname } from "expo-router";
import { TabList, Tabs, TabSlot, TabTrigger } from "expo-router/ui";
import { useEffect, useRef, useState, type ComponentRef, type ComponentProps } from "react";
import { AccessibilityInfo, Animated, I18nManager, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { svgSource } from "@/lib/svg";

// Older installed dev clients retain the translucent treatment until rebuilt.
const blur = Platform.OS === "web" || requireOptionalNativeModule("ExpoBlur")
  // Loaded only when the installed development client includes the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require("expo-blur") as typeof import("expo-blur") : null;
const BlurTarget = blur?.BlurTargetView ?? View;
const sheen = svgSource(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="80" viewBox="0 0 360 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#DBEDFF" stop-opacity=".17"/><stop offset=".42" stop-color="#B1D5FF" stop-opacity=".03"/><stop offset="1" stop-color="#669EFF" stop-opacity=".12"/></linearGradient></defs><rect width="360" height="80" rx="40" fill="url(#g)"/><path d="M40 1H320" stroke="#E1F0FF" stroke-opacity=".18"/></svg>`);
const icons = {
  Chats: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 3V11.5A8.5 8.5 0 0 1 9.5 3h3a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M7 10h8M7 14h5"/>',
  People: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  Settings: '<path d="m9 3 1-2h4l1 2 2 1 2-.2 2 3.5-1.2 1.8V12l1.2 1.8-2 3.5-2-.2-2 1-1 2h-4l-1-2-2-1-2 .2-2-3.5L4.2 12V9.1L3 7.3l2-3.5L7 4Z"/><circle cx="12" cy="10.5" r="3.3"/>',
};
const iconSources = Object.fromEntries(Object.entries(icons).map(([name, paths]) => [name, {
  default: svgSource(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#B1BED5" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`),
  selected: svgSource(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#66AFFF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`),
}]));
type TabName = keyof typeof icons;
type GlassButtonProps = ComponentProps<typeof Pressable> & { label: TabName; isFocused?: boolean };
function GlassButton({ label, isFocused, ...props }: GlassButtonProps) {
  return <Pressable {...props} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: !!isFocused }} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
    <Image source={iconSources[label][isFocused ? "selected" : "default"]} style={styles.icon} accessible={false} />
    <Text style={[styles.label, isFocused && styles.selectedLabel]}>{label}</Text>
  </Pressable>;
}

export function GlassTabs() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const target = useRef<ComponentRef<typeof View> | null>(null);
  const [barWidth, setBarWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [position] = useState(() => new Animated.Value(0));
  const selected = pathname.endsWith("/settings") ? 2 : pathname.endsWith("/people") ? 1 : 0;
  const cellWidth = Math.max(0, (barWidth - 14) / 3);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const toValue = (I18nManager.isRTL ? 2 - selected : selected) * cellWidth;
    if (reduceMotion) { position.setValue(toValue); return; }
    const animation = Animated.spring(position, { toValue, stiffness: 310, damping: 30, mass: 0.85, useNativeDriver: Platform.OS !== "web" });
    animation.start();
    return () => animation.stop();
  }, [cellWidth, selected, reduceMotion, position]);
  return <Tabs options={{ backBehavior: "initialRoute" }} style={styles.root}>
    <TabList style={{ display: "none" }}>
      <TabTrigger name="home" href="/home" />
      <TabTrigger name="people" href="/people" />
      <TabTrigger name="settings" href="/settings" />
    </TabList>
    <BlurTarget ref={target} style={styles.root} collapsable={false}>
      <TabSlot style={styles.root} />
    </BlurTarget>
    <View pointerEvents="box-none" style={[styles.dock, { bottom: Math.max(insets.bottom, 12) + 10 }]}>
      <View style={styles.shadow}>
        <View onLayout={event => setBarWidth(event.nativeEvent.layout.width)} style={styles.glass}>
          {blur && <blur.BlurView testID="glass-tab-backdrop" pointerEvents="none" blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" tint="dark" intensity={65} style={StyleSheet.absoluteFill} />}
          <Image source={sheen} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} pointerEvents="none" />
          {cellWidth > 0 && <Animated.View pointerEvents="none" style={[styles.selection, { width: cellWidth, transform: [{ translateX: position }] }]} />}
          <View style={styles.list}>
            <TabTrigger name="home" asChild><GlassButton label="Chats" /></TabTrigger>
            <TabTrigger name="people" asChild><GlassButton label="People" /></TabTrigger>
            <TabTrigger name="settings" asChild><GlassButton label="Settings" /></TabTrigger>
          </View>
        </View>
      </View>
    </View>
  </Tabs>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020B18" },
  dock: { position: "absolute", left: 20, right: 20, alignItems: "center" },
  shadow: { width: "100%", maxWidth: 370, borderRadius: 40, boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)" },
  glass: { borderRadius: 40, overflow: "hidden", borderWidth: 1, borderColor: "rgba(204, 226, 255, 0.24)", backgroundColor: "rgba(29, 45, 67, 0.40)", minHeight: 78 },
  list: { flexDirection: "row", padding: 6, backgroundColor: "transparent", alignItems: "stretch" },
  tab: { flex: 1, minHeight: 64, alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 33 },
  icon: { width: 25, height: 25 },
  label: { fontSize: 12, fontWeight: "500", color: "#B1BED5" },
  selectedLabel: { color: "#77B8FF", fontWeight: "700" },
  selection: { position: "absolute", top: 6, bottom: 6, left: 6, borderRadius: 33, backgroundColor: "rgba(155, 197, 255, 0.14)", borderWidth: 1, borderColor: "rgba(204, 227, 255, 0.18)", boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.12)" },
  pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
});
