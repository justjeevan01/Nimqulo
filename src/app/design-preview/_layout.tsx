import { Redirect, Stack } from "expo-router";
import { SocialPreviewProvider } from "@/dev/social-fixtures";
export default function DesignPreviewLayout(){if(!__DEV__)return <Redirect href="/"/>;return <SocialPreviewProvider><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:"#020C17"}}}/></SocialPreviewProvider>;}
