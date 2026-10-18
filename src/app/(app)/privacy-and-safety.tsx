import { router } from "expo-router";
import { PrivacySafetyScreen } from "@/components/community/privacy-safety-screen";
import { useCommunity } from "@/state/community-fixtures";
import { useSocial } from "@/state/social-fixtures";
export default function PrivacyRoute(){const state=useCommunity();const social=useSocial();return <PrivacySafetyScreen blocked={[...state.blocked,...social.people.filter(person=>person.blocked)]} people={social.people.filter(person=>!person.blocked)} onBack={()=>router.dismissTo("/settings")} onUnblock={id=>{if(state.blocked.some(person=>person.id===id))state.unblock(id);else social.block(id);}} onReport={social.report} onOpenReport={id=>router.push({pathname:"/report-user",params:{id}})} onDeleteAccount={()=>router.push("/account-deletion")}/>;}
