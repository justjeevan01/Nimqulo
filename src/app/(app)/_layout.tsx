import { Stack } from "expo-router";
import { SocialProvider } from "@/state/social-fixtures";
import { CommunityProvider } from "@/state/community-fixtures";
import { ProfileProvider } from "@/state/profile";
import { ProfileGate } from "@/components/profile/profile-gate";
import { MessengerProvider } from "@/state/messenger";
import { useUser } from "@/state/auth";
import { useEffect } from "react";
import { configureNotifications } from "@/lib/notifications";

// Every fresh sign-in to the approved app group starts with the requested profile screen.
export const unstable_settings = { anchor: "profile-setup" };

export default function AppLayout() {
  const { user } = useUser();
  useEffect(() => { void configureNotifications().catch(() => { /* Existing APKs remain usable until rebuilt. */ }); }, []);
  return <ProfileProvider key={user?.id}><ProfileGate><MessengerProvider><SocialProvider><CommunityProvider><Stack screenOptions={{ headerShown: false }} /></CommunityProvider></SocialProvider></MessengerProvider></ProfileGate></ProfileProvider>;
}
