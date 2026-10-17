import { router } from "expo-router";
import { AccountDeletionScreen } from "@/components/safety/account-deletion-screen";
export default function DeletionPreview() {
  return (
    <AccountDeletionScreen
      preview
      onBack={() => router.dismissTo("/design-preview/privacy-and-safety")}
      onDelete={async () => {
        /* Development preview: never delete an account. */
      }}
    />
  );
}
