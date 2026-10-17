import { Redirect, router } from "expo-router";
import { ProfileSetupScreen } from "@/components/profile/profile-setup-screen";

// A development-only visual harness. It never reads or writes a Clerk account.
export default function ProfilePreviewRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ProfileSetupScreen initialImageSource={require("../../../assets/profile/preview-avatar.png")} onBack={async () => router.replace("/")} onConfirm={() => router.replace("/design-preview/chats?state=empty")} />;
}
