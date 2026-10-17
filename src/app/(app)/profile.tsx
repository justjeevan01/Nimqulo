import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { UserProfileScreen } from "@/components/social/user-profile-screen";

export default function MyProfileRoute() {
  const { user } = useUser();
  return (
    <UserProfileScreen
      self
      person={{
        id: user?.id || "",
        name: user?.fullName || "Your profile",
        username: user?.username || "",
        avatar: user?.imageUrl ? { uri: user.imageUrl } : undefined,
      }}
      onBack={() => router.dismissTo("/settings")}
    />
  );
}
