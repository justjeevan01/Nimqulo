import { useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { useMemo } from "react";
import { createSignOutAction } from "@/lib/sign-out";
import { clearPrivateCache } from "@/lib/local-cache";

export function useAppSignOut() {
  const clerk = useClerk();
  const signOut = useMemo(
    () =>
      createSignOutAction(
        () => clerk.loaded,
        () => clerk.signOut(),
        () => {
          clearPrivateCache();
          router.dismissAll();
          router.replace("/");
        },
      ),
    [clerk],
  );
  return { signOut, isReady: clerk.loaded };
}
