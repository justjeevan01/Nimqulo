import { router } from "expo-router";
import { ChatHomeScreen } from "@/components/chats/chat-home-screen";
import { useMessenger } from "@/state/messenger";
import { TabContent } from "@/components/chats/tab-content";
export default function HomeRoute(){
 const {snapshot,ready}=useMessenger();
 return <TabContent><ChatHomeScreen loading={!ready} conversations={snapshot.conversations.map(c=>({...c,time:new Date(c.updatedAt).toLocaleDateString()}))} onCreateGroup={ready?()=>router.push("/create-group"):undefined} onFindPeople={()=>router.navigate("/people")} onOpenConversation={conversation=>router.push({pathname:conversation.kind==="group"?"/groups/[id]":"/messages/[id]",params:{id:conversation.id,name:conversation.title}})}/></TabContent>;
}
