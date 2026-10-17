import { router } from "expo-router";
import { PeopleScreen } from "@/components/chats/people-screen";
import { TabContent } from "@/components/chats/tab-content";
import { useSocialPreview } from "@/dev/social-fixtures";
export default function PeoplePreviewRoute(){const {people}=useSocialPreview();return <TabContent><PeopleScreen onCreateGroup={()=>router.push("/design-preview/create-group")} onInvitations={()=>router.push("/design-preview/invitations")} people={people.filter(person=>person.connected&&!person.blocked)} onSearch={()=>router.push("/design-preview/username-search")} onRequests={()=>router.push("/design-preview/connection-requests")} onProfile={person=>router.push({pathname:"/design-preview/user-profile",params:{id:person.id}})} onMessage={person=>router.push({pathname:"/design-preview/direct-message",params:{name:person.name,username:person.username}})}/></TabContent>;}
