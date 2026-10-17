import { openNetworkSettings } from "@/lib/open-network-settings";
import { router } from "expo-router";
import { StatusScreen } from "@/components/safety/status-screen";
export default function StatusRoute() {
  return (
    <StatusScreen
      kind="offline"
      onAction={async () => {
        if (router.canGoBack()) router.back();
        else router.replace("/");
      }}
      onSecondary={async () => {
        await openNetworkSettings(() => router.push("/settings"));
      }}
    />
  );
}
