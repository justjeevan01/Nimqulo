import { useAppSignOut } from "@/hooks/use-app-sign-out";
import { StatusScreen } from "@/components/safety/status-screen";
export default function StatusRoute() {
  const { signOut } = useAppSignOut();
  return (
    <StatusScreen
      kind="session"
      onAction={signOut}
    />
  );
}
