import { useAuth, useUser } from "@/state/auth";
import { Redirect } from "expo-router";
import { AccessRequiredScreen } from "@/components/auth/access-required-screen";
import { isAccountApproved } from "@/lib/access";

export default function AccessRequiredRoute() {
  const { isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();
  if (isLoaded && isSignedIn && isAccountApproved(user)) return <Redirect href="/profile-setup" />;
  return <AccessRequiredScreen />;
}
