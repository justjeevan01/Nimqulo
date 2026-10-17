import { Stack } from "expo-router";

// Every fresh sign-in to the approved app group starts with the requested profile screen.
export const unstable_settings = { initialRouteName: "profile-setup" };

export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
