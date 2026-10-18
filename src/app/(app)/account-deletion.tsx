import { router } from "expo-router";
import { AccountDeletionScreen } from "@/components/safety/account-deletion-screen";
export default function DeletionRoute() {
  return (
    <AccountDeletionScreen
      onBack={() => router.dismissTo("/privacy-and-safety")}
    />
  );
}
