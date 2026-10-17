import { useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { StatusScreen } from "@/components/safety/status-screen";
export default function StatusRoute() {
  const { signOut } = useClerk();
  async function signIn() {
    await signOut();
    router.replace("/");
  }
  return (
    <StatusScreen
      kind="session"
      onAction={async () => {
        await signIn();
      }}
    />
  );
}
