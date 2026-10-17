import { router, useLocalSearchParams } from "expo-router";
import { UserProfileScreen } from "@/components/social/user-profile-screen";
export default function UserProfileRoute(){const {id}=useLocalSearchParams<{id:string}>();return <UserProfileScreen person={{id,name:"User profile",username:""}} onBack={()=>router.dismissTo("/people")}/>;}
