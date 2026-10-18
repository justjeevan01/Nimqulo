import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

async function notificationModule() {
  if (Platform.OS === "web") return null;
  if (!requireOptionalNativeModule("ExpoNotificationChannelManager")) {
    throw new Error("Notifications are unavailable in this version. Update Nimqulo and try again.");
  }
  return import("expo-notifications");
}
export async function configureNotifications() {
  const notifications = await notificationModule();
  if (Platform.OS === "android" && notifications) {
    await notifications.setNotificationChannelAsync("messages", {
      name: "Messages", importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250], lightColor: "#0873FF",
    });
  }
}
export async function messageNotificationsAllowed() {
  const notifications = await notificationModule();
  return notifications ? (await notifications.getPermissionsAsync()).granted : true;
}
export async function requestMessageNotifications() {
  const notifications = await notificationModule();
  if (!notifications) return;
  await configureNotifications();
  const current = await notifications.getPermissionsAsync();
  const permission = current.granted ? current : await notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Notifications are disabled in Android settings. You can still use Nimqulo.");
}
