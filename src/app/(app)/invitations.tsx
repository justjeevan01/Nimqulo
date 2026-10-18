import { router } from "expo-router";
import { InvitationsScreen } from "@/components/community/invitations-screen";
import { useCommunity } from "@/state/community-fixtures";
export default function InvitationsRoute(){const state=useCommunity();return <InvitationsScreen invitations={state.invitations} onBack={()=>router.dismissTo("/people")} onDecision={state.decideInvitation}/>;}
