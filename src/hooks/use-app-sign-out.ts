import { useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { useMemo } from "react";
import { createSignOutAction } from "@/lib/sign-out";

export function useAppSignOut() {
  const clerk = useClerk();
  const signOut = useMemo(
    () =>
      createSignOutAction(
        () => clerk.loaded,
        () => clerk.signOut(),
        () => {
          router.dismissAll();
          router.replace("/");
        },
      ),
    [clerk],
  );
  return { signOut, isReady: clerk.loaded };
}
