import { textSize, textLineHeight } from "@/theme/typography";
import { Image, type ImageProps } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";
import type { DirectMessage } from "./direct-message-screen";
import { incomingFill, incomingTail, outgoingFill, outgoingTail } from "./message-art";
import { ReplyPreview } from "./reply-preview";

type Props = {
  message: DirectMessage;
  s: number;
  fontFamily?: string;
  fontScale: number;
  maxWidth?: DimensionValue;
  renderPhoto: (image: ImageProps["source"], imageId?:string) => ReactNode;
};

// Both conversation types use the direct-message presentation as their baseline.
export function MessageBubble({ message, s, fontFamily, fontScale, maxWidth, renderPhoto }: Props) {
  return <View style={{ maxWidth: maxWidth ?? ((message.image||message.imageId) ? "86%" : "92%"), width: (message.image||message.imageId) ? (message.bubbleWidth ?? 290) * s : message.bubbleWidth && fontScale <= 1.2 ? message.bubbleWidth * s : undefined }}>
    <Image source={message.outgoing ? outgoingTail : incomingTail} style={{ position: "absolute", bottom: s, width: 13 * s, height: 17 * s, ...(message.outgoing ? { right: -6 * s } : { left: -6 * s }) }} accessible={false} />
    <View style={{ overflow: "hidden", borderWidth: 1, borderRadius: 17 * s, paddingHorizontal: ((message.image||message.imageId) ? 9 : message.outgoing ? 12 : 14) * s, paddingVertical: ((message.image||message.imageId) ? 8 : message.outgoing ? 9.5 : 9) * s, backgroundColor: message.outgoing ? "#0065FF" : "#142237", borderColor: message.outgoing ? "#1880FF" : "#253C58" }}>
      <Image source={message.outgoing ? outgoingFill : incomingFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
      {message.reply&&<ReplyPreview reply={message.reply} outgoing={message.outgoing} fontFamily={fontFamily}/>}
      {!!message.text && <Text selectable style={{ fontFamily, fontSize: textSize(16.5), lineHeight: textLineHeight(21.5), letterSpacing: -.4 * s, color: message.outgoing ? "#FFFFFF" : "#E4ECFF", ...((message.image||message.imageId) ? { marginHorizontal: 5 * s, marginBottom: 8 * s } : {}) }}>{message.text}</Text>}
      {!!(message.image||message.imageId) && renderPhoto(message.image,message.imageId)}
    </View>
  </View>;
}

export function MessageTime({ time, outgoing, s, fontFamily, message }: { time: string; outgoing?: boolean; s: number; fontFamily?: string;message?:DirectMessage }) {
  const seen=(message?.readBy||0)>0;const status=message?.failed?"Not sent":message?.pending?undefined:outgoing?(seen?`Read${message?.groupReceipt?` by ${message.readBy}`:""}`:"Sent"):undefined;
  return <Text accessibilityLabel={[time,status].filter(Boolean).join(", ")} style={{ fontFamily, fontSize: textSize(11.5), lineHeight: textLineHeight(15), color:seen?"#74BFFF":"#8BA1C9", marginTop: 3 * s, marginHorizontal: outgoing ? 2 * s : 12 * s }}>{time}{status&&<>  <Text style={{letterSpacing:seen?-4:0}}>{seen?"✓✓":message?.failed?"!":"✓"}</Text> {status}</>}</Text>;
}
