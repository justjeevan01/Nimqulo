import { router, useLocalSearchParams } from "expo-router";
import { DirectMessageScreen } from "@/components/messages/direct-message-screen";
export default function GroupRoute(){const {name,id}=useLocalSearchParams<{id:string;name?:string}>();return <DirectMessageScreen onOpenDetails={()=>router.push({pathname:"/group-details/[id]",params:{id}})} groupMode peer={{name:name||"Group chat"}} onBack={()=>router.dismissTo("/home")}/>;}
