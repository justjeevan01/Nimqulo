import { Redirect } from "expo-router";
import { AppTabs } from "@/components/chats/app-tabs";

export const unstable_settings = { initialRouteName: "chats" };

export default function PreviewTabsLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <AppTabs chatsRoute="chats" />;
}
