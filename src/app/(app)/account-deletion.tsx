import { router } from "expo-router";
import { AccountDeletionScreen } from "@/components/safety/account-deletion-screen";
import { useMessenger } from "@/state/messenger";
import { useAppSignOut } from "@/hooks/use-app-sign-out";
import { clearPrivateCache } from "@/lib/local-cache";
export default function DeletionRoute() {
  const {api}=useMessenger();const {signOut}=useAppSignOut();
  return (
    <AccountDeletionScreen
      onBack={() => router.dismissTo("/privacy-and-safety")}
      onDelete={async()=>{await api.deleteAccount();clearPrivateCache();await signOut();}}
    />
  );
}
