import { router } from "expo-router";
import { StatusScreen } from "@/components/safety/status-screen";
export default function StatusPreview() {
  return (
    <StatusScreen
      kind="session"
      onAction={async () => {
        router.replace("/design-preview/chats");
      }}
    />
  );
}
