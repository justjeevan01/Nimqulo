import { router } from "expo-router";
import { ConnectionRequestsScreen } from "@/components/social/connection-requests-screen";
export default function RequestsRoute(){return <ConnectionRequestsScreen onBack={()=>router.dismissTo("/people")}/>;}
