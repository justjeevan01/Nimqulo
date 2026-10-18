import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import Constants from "expo-constants";

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
export async function registerMessagePush(save:(token:string|null)=>Promise<void>){
  const notifications=await notificationModule();if(!notifications)return;
  await configureNotifications();
  if(!(await notifications.getPermissionsAsync()).granted){await save(null);return;}
  const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
  if(!projectId)throw Error("Push notifications are not configured. You can still message in the app.");
  const token=await notifications.getExpoPushTokenAsync({projectId});await save(token.data);
}
export async function observeMessageNotifications(onOpen:(id:string)=>boolean){
  const notifications=await notificationModule();if(!notifications)return ()=>{};
  function open(notification:import("expo-notifications").Notification){const id=notification.request.content.data?.conversationId;return typeof id==="string"&&/^[0-9a-f-]{36}$/i.test(id)&&onOpen(id);}
  const subscription=notifications.addNotificationResponseReceivedListener(response=>open(response.notification));
  const previous=await notifications.getLastNotificationResponseAsync();if(previous&&open(previous.notification))await notifications.clearLastNotificationResponseAsync();
  notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:false,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true})});
  return ()=>subscription.remove();
}
