import { router } from "expo-router";
import { ChatHomeScreen } from "@/components/chats/chat-home-screen";
import { TabContent } from "@/components/chats/tab-content";

// Connect the signed-in user's conversation subscription here when messaging is added.
// Reference conversations are intentionally limited to the development preview.
export default function HomeRoute() {
  return <TabContent><ChatHomeScreen conversations={[]} onFindPeople={() => router.navigate("/people")} onOpenConversation={conversation => { if (conversation.kind === "direct") router.push({ pathname: "/messages/[id]", params: { id: conversation.id, name: conversation.title } }); else router.push({ pathname: "/groups/[id]", params: { id: conversation.id, name: conversation.title } }); }} /></TabContent>;
}
