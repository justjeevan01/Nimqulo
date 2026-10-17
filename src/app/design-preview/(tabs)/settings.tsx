import { router } from "expo-router";
import { TabContent } from "@/components/chats/tab-content";
import { SettingsScreen } from "@/components/community/settings-screen";
import { useCommunityPreview } from "@/dev/community-fixtures";
export default function SettingsPreview(){const state=useCommunityPreview();return <TabContent><SettingsScreen person={{id:"alex",name:"Alex Carter",username:"alexcarter",online:true,avatar:require("../../../../assets/community/settings-alex.png")}} appearance={state.appearance} notifications={state.notifications} onAppearance={state.setAppearance} onNotifications={state.setNotifications} onProfile={()=>router.push("/design-preview/profile")} onPrivacy={()=>router.push("/design-preview/privacy-and-safety")} onSignOut={async()=>router.replace("/")}/></TabContent>;}
