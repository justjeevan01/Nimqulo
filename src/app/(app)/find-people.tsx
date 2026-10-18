import { router } from "expo-router";
import { UsernameSearchScreen } from "@/components/social/username-search-screen";
import { useSocial } from "@/state/social-fixtures";
export default function SearchRoute(){const social=useSocial();return <UsernameSearchScreen available onSearch={social.lookup} people={social.people} onBack={()=>router.dismissTo("/people")} onConnect={social.connect} onProfile={person=>router.push({pathname:"/profiles/[id]",params:{id:person.id}})}/>;}
