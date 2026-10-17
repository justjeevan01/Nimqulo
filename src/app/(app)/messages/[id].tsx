import { router, useLocalSearchParams } from "expo-router";
import { DirectMessageScreen } from "@/components/messages/direct-message-screen";

// The approved app group protects this route. Wire the conversation service here later.
// Reference messages and portraits belong only to the development preview.
export default function DirectMessageRoute() {
  const { name, username } = useLocalSearchParams<{ id: string; name?: string; username?: string }>();
  return <DirectMessageScreen peer={{ name: name || "Direct message", username }} onBack={() => router.dismissTo("/home")} />;
}
