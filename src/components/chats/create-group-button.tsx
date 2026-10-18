import { textSize } from "@/theme/typography";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text } from "react-native";
import { icons } from "@/components/social/social-ui";
import { blueFill } from "./chat-art";

export function CreateGroupButton({ s, fontFamily, onPress }: { s: number; fontFamily?: string; onPress?:()=>void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Create Group" accessibilityState={{ disabled: !onPress }} disabled={!onPress} onPress={onPress} style={{ minHeight: 44, height: 44 * s, paddingHorizontal: 14 * s, borderRadius: 23 * s, borderWidth: 1, borderColor: "#269CFF", backgroundColor: "#0067FF", overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 * s, opacity: onPress ? 1 : .65 }}>
    <Image source={blueFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false}/>
    <Image source={icons.people} style={{ width: 18 * s, height: 18 * s }} accessible={false}/>
    <Text style={{ fontFamily, fontSize: textSize(14), fontWeight: "600", color: "white", includeFontPadding: false }}>Create Group</Text>
  </Pressable>;
}
