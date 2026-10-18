import { Stack } from "expo-router";
import { SocialProvider } from "@/state/social-fixtures";
import { CommunityProvider } from "@/state/community-fixtures";

// Every fresh sign-in to the approved app group starts with the requested profile screen.
export const unstable_settings = { initialRouteName: "profile-setup" };

export default function AppLayout() {
  return <SocialProvider><CommunityProvider><Stack screenOptions={{ headerShown: false }} /></CommunityProvider></SocialProvider>;
}
