import "../../global.css";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth, useUser } from "@/state/auth";
import { ActivityIndicator, View } from "react-native";
import { getPostSignInRoute, isAccountApproved } from "@/lib/access";
import { useAccessFailureRouting } from "@/state/messenger";
import { useEffect } from "react";
import { clearPrivateCache } from "@/lib/local-cache";

function AuthNavigator() {
  useAccessFailureRouting();
  const pathname = usePathname();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  useEffect(()=>{if(authLoaded&&!isSignedIn)clearPrivateCache();},[authLoaded,isSignedIn]);
  const { user, isLoaded: userLoaded } = useUser();
  const isStatusScreen = ["/offline", "/account-suspended", "/concurrent-session"].includes(pathname);
  const isSignInScreen = pathname === "/";
  // Status pages contain no account data and must render even while authentication is offline.
  // Resolve both identity and admin approval before mounting any protected screen.
  if ((!authLoaded || !userLoaded) && !isStatusScreen && !isSignInScreen) return <View style={{ flex: 1, backgroundColor: "#020B18", alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#008BFF" /></View>;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#020B18" } }}>
      <Stack.Protected guard={!authLoaded || !userLoaded || !isSignedIn} redirectTo={getPostSignInRoute(user)}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={authLoaded && userLoaded && !!isSignedIn && isAccountApproved(user)}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="access-required" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthNavigator />
    </AuthProvider>
  );
}
