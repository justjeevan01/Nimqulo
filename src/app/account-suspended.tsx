import { useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { Linking } from "react-native";
import { StatusScreen } from "@/components/safety/status-screen";
export default function StatusRoute() {
  const { signOut } = useClerk();
  async function signIn() {
    await signOut();
    router.replace("/");
  }
  return (
    <StatusScreen
      kind="suspended"
      onAction={async () => {
        await Linking.openURL("mailto:jeevanofficial1120@gmail.com");
      }}
      onSecondary={signIn}
    />
  );
}
