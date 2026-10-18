import { Linking, Platform } from "react-native";

// Browser previews cannot open operating-system settings.
export async function openNetworkSettings(
  webFallback: () => void,
): Promise<void> {
  if (Platform.OS === "web") {
    webFallback();
    return;
  }
  if (Platform.OS === "android")
    await Linking.sendIntent("android.settings.WIRELESS_SETTINGS");
  else await Linking.openSettings();
}
