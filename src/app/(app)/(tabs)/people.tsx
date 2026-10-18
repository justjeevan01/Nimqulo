import { router } from "expo-router";
import { PeopleScreen } from "@/components/chats/people-screen";
import { TabContent } from "@/components/chats/tab-content";
import { useSocial } from "@/state/social-fixtures";
export default function PeopleRoute(){const {people}=useSocial();return <TabContent><PeopleScreen onCreateGroup={()=>router.push("/create-group")} onInvitations={()=>router.push("/invitations")} people={people.filter(person=>person.connected&&!person.blocked)} onSearch={()=>router.push("/find-people")} onRequests={()=>router.push("/connection-requests")} onProfile={person=>router.push({pathname:"/profiles/[id]",params:{id:person.id}})} onMessage={person=>router.push({pathname:"/messages/[id]",params:{id:person.id,name:person.name,username:person.username}})}/></TabContent>;}
