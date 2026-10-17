import { router } from "expo-router";
import { CreateGroupScreen } from "@/components/community/create-group-screen";
export default function CreateGroupRoute(){return <CreateGroupScreen onBack={()=>router.canGoBack()?router.back():router.replace("/people")}/>;}
