import { isClerkAPIResponseError, useAuth, useSSO } from "@clerk/expo";
import { makeRedirectUri } from "expo-auth-session";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";

export function useGoogleSignIn() {
  const { isLoaded } = useAuth();
  const { startSSOFlow } = useSSO();
  const pending = useRef(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync().catch(() => {});
    return () => { void WebBrowser.coolDownAsync().catch(() => {}); };
  }, []);

  const signIn = async () => {
    if (!isLoaded || pending.current) return;
    pending.current = true;
    setIsSigningIn(true);
    setError(null);
    try {
      const { createdSessionId, setActive, signIn, signUp, authSessionResult } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: makeRedirectUri({ scheme: "triplyai", path: "sso-callback" }),
      });
      if (authSessionResult?.type === "cancel" || authSessionResult?.type === "dismiss") return;
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // The root route guard handles navigation after the session becomes active.
      } else if (signUp?.status === "missing_requirements") {
        setError("Your account needs more information. Please contact the person who invited you.");
      } else if (signIn?.status === "needs_second_factor" || signIn?.status === "needs_client_trust") {
        setError("Your account requires additional verification. Please contact the person who invited you.");
      } else if (authSessionResult?.type === "success") {
        setError("Sign-in wasn’t completed. Please try again.");
      }
      // Closing or cancelling the browser leaves the user on this screen without an error.
    } catch (cause) {
      // Clerk's restricted sign-up mode is the authority for invitation access.
      if (isClerkAPIResponseError(cause) && cause.errors.some(({ code }) => code === "sign_up_mode_restricted")) {
        router.push("/access-required");
        return;
      }
      const providerError = isClerkAPIResponseError(cause) ? cause.errors[0] : undefined;
      setError(providerError?.longMessage || providerError?.message || "We couldn’t sign you in. Check your connection and invitation, then try again.");
    } finally {
      pending.current = false;
      setIsSigningIn(false);
    }
  };

  return { signIn, isReady: isLoaded, isSigningIn, error };
}
