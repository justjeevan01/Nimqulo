import { router } from "expo-router";
import { PrivacySafetyScreen } from "@/components/community/privacy-safety-screen";
export default function PrivacyRoute(){return <PrivacySafetyScreen onDeleteAccount={()=>router.push("/account-deletion")} onBack={()=>router.dismissTo("/settings")}/>;}
