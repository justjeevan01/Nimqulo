import { AuthScreen } from "@/components/auth/auth-screen";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";

export default function SignInRoute() {
  const { signIn, isReady, isSigningIn, error } = useGoogleSignIn();
  return <AuthScreen onGoogleSignIn={signIn} isReady={isReady} isSigningIn={isSigningIn} error={error} />;
}
