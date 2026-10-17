import { router } from "expo-router";
import { PeopleScreen } from "@/components/chats/people-screen";
import { TabContent } from "@/components/chats/tab-content";
export default function PeopleRoute(){return <TabContent><PeopleScreen onSearch={()=>router.push("/find-people")} onRequests={()=>router.push("/connection-requests")} onProfile={person=>router.push({pathname:"/profiles/[id]",params:{id:person.id}})}/></TabContent>;}
