import { Image, type ImageProps } from "expo-image";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Avatar, icons } from "@/components/social/social-ui";
import type { Person } from "@/components/social/types";
import type { DirectMessage } from "./direct-message-screen";
import { MessageBubble, MessageTime } from "./message-bubble";

type Props = {
  message: DirectMessage;
  s: number;
  fontFamily?: string;
  fontScale: number;
  onProfile?: (person: Person) => void;
  renderPhoto: (image: ImageProps["source"]) => ReactNode;
};

export function GroupMessage({ message, s, fontFamily, fontScale, onProfile, renderPhoto }: Props) {
  if (message.system) return <View style={{ flexDirection: "row", alignItems: "center", gap: 12 * s, padding: 12 * s, borderWidth: 1, borderColor: "#1C3653", borderRadius: 999 * s, backgroundColor: "#091728" }}>
    <Image source={icons.people} style={{ width: 24 * s, height: 24 * s }} accessible={false}/>
    <Text style={{ flex: 1, fontFamily, fontSize: 13 * s, lineHeight: 18 * s, color: "#A5BEF0" }}>{message.text}</Text>
  </View>;

  // Reference-specific narrow widths must not shrink the group's message contents.
  const content = <>
    <MessageBubble message={{ ...message, bubbleWidth: undefined }} s={s} fontFamily={fontFamily} fontScale={fontScale} maxWidth="100%" renderPhoto={renderPhoto}/>
    <MessageTime time={message.time} outgoing={message.outgoing} s={s} fontFamily={fontFamily}/>
  </>;
  if (message.outgoing) return <View style={{ alignItems: "flex-end", paddingLeft: 48 * s }}>{content}</View>;

  return <View style={{ flexDirection: "row", gap: 12 * s }}>
    {message.sender && <Pressable accessibilityRole="button" accessibilityLabel={`View ${message.sender.name}'s profile`} onPress={() => message.sender && onProfile?.(message.sender)} style={{ paddingTop: 21 * s }}>
      <Avatar person={message.sender} size={36 * s}/>
    </Pressable>}
    <View style={{ flex: 1, alignItems: "flex-start", paddingRight: 20 * s }}>
      {message.sender && <Text style={{ fontFamily, fontSize: 13 * s, lineHeight: 18 * s, color: "#ACC3F2", marginLeft: 3 * s, marginBottom: 3 * s }}>{message.sender.name}</Text>}
      {content}
    </View>
  </View>;
}
