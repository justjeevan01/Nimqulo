import { router } from "expo-router";
import { ChatHomeScreen, type Conversation } from "@/components/chats/chat-home-screen";
import { useCommunity } from "@/state/community-fixtures";
import { TabContent } from "@/components/chats/tab-content";

const samples: readonly Conversation[] = [
  { id: "teyler", title: "Teyler Kim", message: "Sounds good! Let’s do it.", time: "10:34 AM", kind: "direct", avatar: require("../../../../assets/chats/preview-teyler.png") },
  { id: "design", title: "Design Squad", message: "Alex: New mockups are in", time: "9:41 AM", kind: "group", unread: 3, avatar: require("../../../../assets/chats/preview-design.png") },
  { id: "jordan", title: "Jordan Lee", message: "Perfect, thanks!", time: "Yesterday", kind: "direct", avatar: require("../../../../assets/chats/preview-jordan.png") },
  { id: "family", title: "Family Group", message: "Mia: Photo", time: "Mon", kind: "group", avatar: require("../../../../assets/chats/preview-family.png") },
  { id: "chris", title: "Chris Park", message: "See you soon!", kind: "direct", avatar: require("../../../../assets/chats/preview-chris.png") },
];

export default function HomeRoute() {
  const {groups}=useCommunity();
  const added:Conversation[]=groups.filter(group=>group.added&&!samples.some(conversation=>conversation.id===group.id)).map(group=>({id:group.id,title:group.name,message:"No messages yet",kind:"group",avatar:group.avatar||require("../../../../assets/community/group-cover.png")}));
  const existing=samples.filter(conversation=>conversation.kind!=="group"||groups.some(group=>group.id===conversation.id)).map(conversation=>{const group=conversation.kind==="group"?groups.find(group=>group.id===conversation.id):undefined;return group?{...conversation,title:group.name,avatar:group.avatar||conversation.avatar}:conversation;});
  return <TabContent>
    <ChatHomeScreen onCreateGroup={()=>router.push("/create-group")} conversations={[...existing,...added]} onFindPeople={() => router.navigate("/people")} onOpenConversation={conversation => {
      if (conversation.kind === "direct") router.push({ pathname: "/messages/[id]", params: { id: conversation.id, ...(conversation.id === "teyler" ? {} : { name: conversation.title, username: conversation.title.toLowerCase().replace(/\s/g, "") }) } });
      else router.push({ pathname: "/groups/[id]", params: { name: conversation.title, id:conversation.id } });
    }} />
  </TabContent>;
}
