import { router } from "expo-router";
import { UsernameSearchScreen } from "@/components/social/username-search-screen";
export default function FindPeopleRoute(){return <UsernameSearchScreen onBack={()=>router.dismissTo("/people")}/>;}
