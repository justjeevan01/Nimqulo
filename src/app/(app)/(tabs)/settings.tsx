import { useClerk, useUser } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { TabContent } from "@/components/chats/tab-content";
import { SettingsScreen } from "@/components/community/settings-screen";
export default function SettingsRoute(){const {user}=useUser();const {signOut}=useClerk();const [appearance,setAppearance]=useState("System");const [notifications,setNotifications]=useState(true);return <TabContent><SettingsScreen person={{id:user?.id||"",name:user?.fullName||"Your profile",username:user?.username||"",avatar:user?.imageUrl?{uri:user.imageUrl}:undefined}} appearance={appearance} notifications={notifications} onAppearance={setAppearance} onNotifications={setNotifications} onProfile={()=>router.push("/profile")} onPrivacy={()=>router.push("/privacy-and-safety")} onSignOut={async()=>{await signOut();}}/></TabContent>;}
