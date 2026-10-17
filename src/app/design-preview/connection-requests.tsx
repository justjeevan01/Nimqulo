import { router } from "expo-router";
import { ConnectionRequestsScreen } from "@/components/social/connection-requests-screen";
import { useSocialPreview } from "@/dev/social-fixtures";
export default function RequestsPreview(){const social=useSocialPreview();return <ConnectionRequestsScreen requests={social.requests} onBack={()=>router.dismissTo("/design-preview/people")} onProfile={person=>router.push({pathname:"/design-preview/user-profile",params:{id:person.id}})} onAccept={social.accept} onDecline={social.dismiss} onCancel={social.dismiss}/>;}
