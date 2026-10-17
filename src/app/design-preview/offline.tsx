import { openNetworkSettings } from "@/lib/open-network-settings";
import { router } from "expo-router";
import { StatusScreen } from "@/components/safety/status-screen";
export default function StatusPreview() {
  return (
    <StatusScreen
      kind="offline"
      onAction={async () => {
        router.replace("/design-preview/chats");
      }}
      onSecondary={async () => {
        await openNetworkSettings(() =>
          router.replace("/design-preview/settings"),
        );
      }}
    />
  );
}
