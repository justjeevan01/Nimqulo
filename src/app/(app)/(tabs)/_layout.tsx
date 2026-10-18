import { useUser } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AppTabs } from "@/components/chats/app-tabs";
import { isAccountApproved } from "@/lib/access";

export const unstable_settings = { anchor: "home" };

export default function MainTabsLayout() {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: "#020B18", alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#008BFF" /></View>;
  if (!isAccountApproved(user)) return <Redirect href="/access-required" />;
  return <AppTabs />;
}
