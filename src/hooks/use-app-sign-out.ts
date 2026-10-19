import { useAuth } from "@/state/auth";
import { useBackend } from "./use-backend";
import { ApiError } from "@/lib/backend";
import { router } from "expo-router";
import { useMemo } from "react";
import { createSignOutAction } from "@/lib/sign-out";
import { clearPrivateCache } from "@/lib/local-cache";

export function useAppSignOut() {
  const auth = useAuth();
  const api=useBackend();
  const signOut = useMemo(
    () =>
      createSignOutAction(
        () => auth.isLoaded,
        async()=>{
          if(auth.isSignedIn&&auth.user?.approved){try{await api.endSession();}catch(cause){if(!(cause instanceof ApiError)||![401,403,409].includes(cause.status))throw cause;}}
          await auth.signOut();
        },
        () => {
          clearPrivateCache();
          router.dismissAll();
          router.replace("/");
        },
      ),
    [auth,api],
  );
  return { signOut, isReady: auth.isLoaded };
}
