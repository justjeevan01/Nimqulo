import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { useCommunity } from "@/state/community-fixtures";
import { TabContent } from "@/components/chats/tab-content";
import { useAppSignOut } from "@/hooks/use-app-sign-out";
import { SettingsScreen } from "@/components/community/settings-screen";
export default function SettingsRoute(){const {user}=useUser();const {signOut,isReady}=useAppSignOut();const {appearance,setAppearance,notifications,setNotifications}=useCommunity();return <TabContent><SettingsScreen person={{id:user?.id||"",name:user?.fullName||"Your profile",username:user?.username||"",avatar:user?.imageUrl?{uri:user.imageUrl}:undefined}} appearance={appearance} notifications={notifications} onAppearance={setAppearance} onNotifications={setNotifications} onProfile={()=>router.push("/profile")} onPrivacy={()=>router.push("/privacy-and-safety")} onSignOut={signOut} signOutReady={isReady}/></TabContent>;}
