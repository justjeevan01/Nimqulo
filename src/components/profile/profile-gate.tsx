import { Redirect, usePathname } from "expo-router";
import { ActivityIndicator } from "react-native";
import { StyledPressable as Pressable, StyledText as Text, StyledView as View } from "@/components/ui/styled";
import { useState, type PropsWithChildren } from "react";
import { useProfile } from "@/state/profile";
import { useAppSignOut } from "@/hooks/use-app-sign-out";

export function ProfileGate({ children }: PropsWithChildren) {
  const { profile, ready, error, retry } = useProfile();
  const pathname = usePathname();
  const { signOut, isReady } = useAppSignOut();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  if (!ready) return <View className="flex-1 items-center justify-center bg-[#020B18] px-6">
    {error ? <>
      <Text accessibilityRole="alert" className="text-center text-base text-white">{error}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry loading profile" onPress={retry} className="mt-5 min-h-12 justify-center rounded-full bg-[#0065FF] px-6">
        <Text className="text-base font-semibold text-white">Retry</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Return to sign in" disabled={!isReady || signingOut} onPress={() => {
        setSigningOut(true); setSignOutError("");
        void signOut().catch(() => setSignOutError("Could not sign out. Please try again.")).finally(() => setSigningOut(false));
      }} className="mt-3 min-h-12 justify-center px-6">
        <Text className="text-base text-white">{signingOut ? "Signing out…" : "Return to sign in"}</Text>
      </Pressable>
      {!!signOutError && <Text accessibilityRole="alert" className="mt-3 text-center text-base text-white">{signOutError}</Text>}
    </> : <ActivityIndicator accessibilityLabel="Loading your profile" color="#008BFF" />}
  </View>;
  if (!profile && pathname !== "/profile-setup") return <Redirect href="/profile-setup" />;
  return children;
}
