import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ActivityIndicator, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { isAccountApproved } from "@/lib/access";

// The web popup also loads this layout when it redirects to /sso-callback.
WebBrowser.maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AuthNavigator() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  // Resolve both identity and admin approval before mounting any protected screen.
  if (!authLoaded || !userLoaded) return <View style={{ flex: 1, backgroundColor: "#020B18", alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#008BFF" /></View>;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#020B18" } }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={!!isSignedIn && isAccountApproved(user)}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="access-required" />
      <Stack.Screen name="sso-callback" />
    </Stack>
  );
}

export default function RootLayout() {
  if (!publishableKey) {
    throw new Error("Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your local environment before starting Nimqulo.");
  }
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <StatusBar style="light" />
      <AuthNavigator />
    </ClerkProvider>
  );
}
