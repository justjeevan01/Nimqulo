import { router } from "expo-router";
import { ConnectionRequestsScreen } from "@/components/social/connection-requests-screen";
import { useSocial } from "@/state/social-fixtures";
export default function RequestsRoute(){const social=useSocial();return <ConnectionRequestsScreen requests={social.requests} onBack={()=>router.dismissTo("/people")} onProfile={person=>router.push({pathname:"/profiles/[id]",params:{id:person.id}})} onAccept={social.accept} onDecline={social.dismiss} onCancel={social.dismiss}/>;}
