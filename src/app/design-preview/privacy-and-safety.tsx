import { router } from "expo-router";
import { PrivacySafetyScreen } from "@/components/community/privacy-safety-screen";
import { useCommunityPreview } from "@/dev/community-fixtures";
import { useSocialPreview } from "@/dev/social-fixtures";
export default function PrivacyPreview(){const state=useCommunityPreview();const social=useSocialPreview();return <PrivacySafetyScreen blocked={[...state.blocked,...social.people.filter(person=>person.blocked)]} people={social.people.filter(person=>!person.blocked)} onBack={()=>router.dismissTo("/design-preview/settings")} onUnblock={id=>{if(state.blocked.some(person=>person.id===id))state.unblock(id);else social.block(id);}} onReport={social.report} onOpenReport={id=>router.push({pathname:"/design-preview/report-user",params:{id}})} onDeleteAccount={()=>router.push("/design-preview/account-deletion")}/>;}
