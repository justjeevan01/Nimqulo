import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { UserProfileScreen } from "@/components/social/user-profile-screen";
import { useProfile } from "@/state/profile";

export default function MyProfileRoute() {
  const { user } = useUser();
  const { profile } = useProfile();
  return (
    <UserProfileScreen
      self
      person={{
        id: user?.id || "",
        name: profile?.displayName || "Your profile",
        username: profile?.username || "",
        avatar: user?.imageUrl ? { uri: user.imageUrl } : undefined,
      }}
      onBack={() => router.dismissTo("/settings")}
    />
  );
}
