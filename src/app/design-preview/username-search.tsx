import { router } from "expo-router";
import { UsernameSearchScreen } from "@/components/social/username-search-screen";
import { searchPerson, useSocialPreview } from "@/dev/social-fixtures";
export default function SearchPreview(){const social=useSocialPreview();return <UsernameSearchScreen available initialQuery={searchPerson.username} people={[{...searchPerson,requested:social.requested.includes(searchPerson.username)}]} onBack={()=>router.dismissTo("/design-preview/people")} onConnect={social.connect} onProfile={person=>router.push({pathname:"/design-preview/user-profile",params:{id:person.id}})}/>;}
