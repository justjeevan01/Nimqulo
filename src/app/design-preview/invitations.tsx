import { router } from "expo-router";
import { InvitationsScreen } from "@/components/community/invitations-screen";
import { useCommunityPreview } from "@/dev/community-fixtures";
export default function InvitationsPreview(){const state=useCommunityPreview();return <InvitationsScreen invitations={state.invitations} onBack={()=>router.dismissTo("/design-preview/people")} onDecision={state.decideInvitation}/>;}
