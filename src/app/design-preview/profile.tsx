import { router } from "expo-router";
import { UserProfileScreen } from "@/components/social/user-profile-screen";

export default function MyProfilePreview() {
  return (
    <UserProfileScreen
      self
      person={{
        id: "alex",
        name: "Alex Carter",
        username: "alexcarter",
        avatar: require("../../../assets/community/settings-alex.png"),
      }}
      onBack={() => router.dismissTo("/design-preview/settings")}
    />
  );
}
