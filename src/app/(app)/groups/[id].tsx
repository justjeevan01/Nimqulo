import { router, useLocalSearchParams } from "expo-router";
import { DirectMessageScreen } from "@/components/messages/direct-message-screen";
export default function GroupRoute(){const {name}=useLocalSearchParams<{id:string;name?:string}>();return <DirectMessageScreen groupMode peer={{name:name||"Group chat"}} onBack={()=>router.dismissTo("/home")}/>;}
