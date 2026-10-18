import { DarkTheme, ThemeProvider } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";

export function AppTabs() {
  return <ThemeProvider value={DarkTheme}>
    <NativeTabs backBehavior="initialRoute" backgroundColor="#04101E" tintColor="#0873FF"
      iconColor={{ default: "#99ADD5", selected: "#0873FF" }}
      labelStyle={{ default: { color: "#99ADD5" }, selected: { color: "#0873FF" } }}
      indicatorColor="#102F58" labelVisibilityMode="labeled" disableTransparentOnScrollEdge minimizeBehavior="never">
      <NativeTabs.Trigger name="home" accessibilityLabel="Chats" contentStyle={{ backgroundColor: "#020B18" }} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: "bubble.left", selected: "bubble.left.fill" }} md="chat_bubble" />
        <NativeTabs.Trigger.Label>Chats</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="people" accessibilityLabel="People" contentStyle={{ backgroundColor: "#020B18" }} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
        <NativeTabs.Trigger.Label>People</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" accessibilityLabel="Settings" contentStyle={{ backgroundColor: "#020B18" }} disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  </ThemeProvider>;
}
