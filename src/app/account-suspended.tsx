import { useAppSignOut } from "@/hooks/use-app-sign-out";
import { Linking } from "react-native";
import { StatusScreen } from "@/components/safety/status-screen";
export default function StatusRoute() {
  const { signOut } = useAppSignOut();
  return (
    <StatusScreen
      kind="suspended"
      onAction={async () => {
        await Linking.openURL("mailto:jeevanofficial1120@gmail.com");
      }}
      onSecondary={signOut}
    />
  );
}
