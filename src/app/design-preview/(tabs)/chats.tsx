import { router } from "expo-router";
import { ChatHomeScreen, type Conversation } from "@/components/chats/chat-home-screen";
import { TabContent } from "@/components/chats/tab-content";

const samples: readonly Conversation[] = __DEV__ ? [
  { id: "teyler", title: "Teyler Kim", message: "Sounds good! Let’s do it.", time: "10:34 AM", kind: "direct", avatar: require("../../../../assets/chats/preview-teyler.png") },
  { id: "design", title: "Design Squad", message: "Alex: New mockups are in", time: "9:41 AM", kind: "group", unread: 3, avatar: require("../../../../assets/chats/preview-design.png") },
  { id: "jordan", title: "Jordan Lee", message: "Perfect, thanks!", time: "Yesterday", kind: "direct", avatar: require("../../../../assets/chats/preview-jordan.png") },
  { id: "family", title: "Family Group", message: "Mia: Photo", time: "Mon", kind: "group", avatar: require("../../../../assets/chats/preview-family.png") },
  { id: "chris", title: "Chris Park", message: "See you soon!", kind: "direct", avatar: require("../../../../assets/chats/preview-chris.png") },
] : [];

export default function ChatsPreviewRoute() {
  return <TabContent>
    <ChatHomeScreen conversations={samples} onFindPeople={() => router.navigate("/design-preview/people")} onOpenConversation={conversation => {
      if (conversation.kind === "direct") router.push({ pathname: "/design-preview/direct-message", params: conversation.id === "teyler" ? {} : { name: conversation.title, username: conversation.title.toLowerCase().replace(/\s/g, "") } });
      else router.push({ pathname: "/design-preview/group-chat", params: { name: conversation.title } });
    }} />
  </TabContent>;
}
