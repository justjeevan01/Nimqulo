import { router } from "expo-router";
import { Linking } from "react-native";
import { StatusScreen } from "@/components/safety/status-screen";
export default function StatusPreview() {
  return (
    <StatusScreen
      kind="suspended"
      onAction={async () => {
        await Linking.openURL("mailto:jeevanofficial1120@gmail.com");
      }}
      onSecondary={async () => {
        router.replace("/");
      }}
    />
  );
}
