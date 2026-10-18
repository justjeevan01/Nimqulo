import { router } from "expo-router";
import { PeopleScreen } from "@/components/chats/people-screen";
import { TabContent } from "@/components/chats/tab-content";
import { useSocial } from "@/state/social-fixtures";
import { useMessenger } from "@/state/messenger";
export default function PeopleRoute(){const {people}=useSocial();const {api,perform,ready}=useMessenger();return <TabContent><PeopleScreen onCreateGroup={ready?()=>router.push("/create-group"):undefined} onInvitations={()=>router.push("/invitations")} people={people.filter(person=>person.connected&&!person.blocked)} onSearch={()=>router.push("/find-people")} onRequests={()=>router.push("/connection-requests")} onProfile={person=>router.push({pathname:"/profiles/[id]",params:{id:person.id}})} onMessage={person=>{void perform(()=>api.direct(person.id)).then(c=>router.push({pathname:"/messages/[id]",params:{id:c.id}})).catch(()=>{});}}/></TabContent>;}
