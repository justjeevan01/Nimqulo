import { textSize, textLineHeight } from "@/theme/typography";
import { Image, type ImageProps } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";
import type { DirectMessage } from "./direct-message-screen";
import { incomingFill, incomingTail, outgoingFill, outgoingTail } from "./message-art";

type Props = {
  message: DirectMessage;
  s: number;
  fontFamily?: string;
  fontScale: number;
  maxWidth?: DimensionValue;
  renderPhoto: (image: ImageProps["source"]) => ReactNode;
};

// Both conversation types use the direct-message presentation as their baseline.
export function MessageBubble({ message, s, fontFamily, fontScale, maxWidth, renderPhoto }: Props) {
  return <View style={{ maxWidth: maxWidth ?? (message.image ? "86%" : "92%"), width: message.image ? (message.bubbleWidth ?? 290) * s : message.bubbleWidth && fontScale <= 1.2 ? message.bubbleWidth * s : undefined }}>
    <Image source={message.outgoing ? outgoingTail : incomingTail} style={{ position: "absolute", bottom: s, width: 13 * s, height: 17 * s, ...(message.outgoing ? { right: -6 * s } : { left: -6 * s }) }} accessible={false} />
    <View style={{ overflow: "hidden", borderWidth: 1, borderRadius: 17 * s, paddingHorizontal: (message.image ? 9 : message.outgoing ? 12 : 14) * s, paddingVertical: (message.image ? 8 : message.outgoing ? 9.5 : 9) * s, backgroundColor: message.outgoing ? "#0065FF" : "#142237", borderColor: message.outgoing ? "#1880FF" : "#253C58" }}>
      <Image source={message.outgoing ? outgoingFill : incomingFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
      {!!message.text && <Text selectable style={{ fontFamily, fontSize: textSize(16.5), lineHeight: textLineHeight(21.5), letterSpacing: -.4 * s, color: message.outgoing ? "#FFFFFF" : "#E4ECFF", ...(message.image ? { marginHorizontal: 5 * s, marginBottom: 8 * s } : {}) }}>{message.text}</Text>}
      {!!message.image && renderPhoto(message.image)}
    </View>
  </View>;
}

export function MessageTime({ time, outgoing, s, fontFamily }: { time: string; outgoing?: boolean; s: number; fontFamily?: string }) {
  return <Text style={{ fontFamily, fontSize: textSize(11.5), lineHeight: textLineHeight(15), color: "#8BA1C9", marginTop: 3 * s, marginHorizontal: outgoing ? 2 * s : 12 * s }}>{time}</Text>;
}
