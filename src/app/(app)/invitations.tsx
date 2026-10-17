import { router } from "expo-router";
import { InvitationsScreen } from "@/components/community/invitations-screen";
export default function InvitationsRoute(){return <InvitationsScreen onBack={()=>router.dismissTo("/people")}/>;}
