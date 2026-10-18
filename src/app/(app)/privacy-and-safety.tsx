import { router } from "expo-router";
import { PrivacySafetyScreen } from "@/components/community/privacy-safety-screen";
import { useCommunity } from "@/state/community-fixtures";
import { useSocial } from "@/state/social-fixtures";
export default function PrivacyRoute(){const state=useCommunity();const social=useSocial();return <PrivacySafetyScreen blocked={state.blocked} people={social.people} onBack={()=>router.dismissTo("/settings")} onUnblock={state.unblock} onOpenReport={id=>router.push({pathname:"/report-user",params:{id}})} onDeleteAccount={()=>router.push("/account-deletion")}/>;}
