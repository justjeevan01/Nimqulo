import { router, useLocalSearchParams } from "expo-router";
import { DirectMessageScreen, type DirectMessage } from "@/components/messages/direct-message-screen";

const sampleMessages: readonly DirectMessage[] = [
  { id: "1", text: "Hey! Are you free this weekend?", time: "9:24 AM", bubbleWidth: 278 },
  { id: "2", text: "Yes! I’m thinking a hike\non Saturday.", time: "10:04 AM", outgoing: true, bubbleWidth: 229 },
  { id: "3", text: "That sounds perfect! 👌", time: "10:24 AM", bubbleWidth: 222 },
  { id: "4", text: "Here’s the spot I was thinking\nabout.", time: "10:24 AM", image: require("../../../../assets/messages/preview-mountains.png"), bubbleWidth: 290 },
  { id: "5", text: "Looks amazing! 👌", time: "10:26 AM", outgoing: true, failed: true, bubbleWidth: 171 },
];

export default function DirectMessageRoute() {
  const { name, username } = useLocalSearchParams<{ name?: string; username?: string }>();
  return <DirectMessageScreen peer={{ name: name || "Taylor Kim", username: username || "taylorkim", avatar: require("../../../../assets/messages/preview-taylor.png") }} initialMessages={sampleMessages} onBack={() => router.dismissTo("/home")} onSend={async () => { throw new Error("Message delivery is not connected yet."); }} />;
}
