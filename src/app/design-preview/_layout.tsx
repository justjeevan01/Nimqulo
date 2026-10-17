import { Redirect, Stack } from "expo-router";
import { SocialPreviewProvider } from "@/dev/social-fixtures";
import { CommunityPreviewProvider } from "@/dev/community-fixtures";
export default function DesignPreviewLayout(){if(!__DEV__)return <Redirect href="/"/>;return <SocialPreviewProvider><CommunityPreviewProvider><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:"#020C17"}}}/></CommunityPreviewProvider></SocialPreviewProvider>;}
