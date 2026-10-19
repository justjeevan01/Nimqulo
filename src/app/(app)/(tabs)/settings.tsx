import { useUser } from "@/state/auth";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useCommunity } from "@/state/community-fixtures";
import { useProfile } from "@/state/profile";
import { TabContent } from "@/components/chats/tab-content";
import { useAppSignOut } from "@/hooks/use-app-sign-out";
import { SettingsScreen } from "@/components/community/settings-screen";
import { messageNotificationsAllowed, requestMessageNotifications,registerMessagePush } from "@/lib/notifications";
import { useMessenger } from "@/state/messenger";

export default function SettingsRoute() {
  const { user } = useUser();
  const {api,snapshot}=useMessenger();
  const { profile } = useProfile();
  const { signOut, isReady } = useAppSignOut();
  const { appearance, setAppearance, notifications, setNotifications,previews,setPreviews, preferenceError, preferencesReady, preferencesBusy, retryPreferences } = useCommunity();
  const [permissionError, setPermissionError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>();
  useEffect(() => {
    let active = true;
    void messageNotificationsAllowed().then(value => { if (active) setPermissionGranted(value); })
      .catch(() => { if (active) setPermissionGranted(false); });
    return () => { active = false; };
  }, []);
  async function changeNotifications(value: boolean) {
    if (requesting) return;
    setPermissionError(""); setRequesting(true);
    try {
      if (value) { await requestMessageNotifications(); setPermissionGranted(true);await registerMessagePush(api.saveDevice); }
      setNotifications(value);
    } catch (cause) { setPermissionError(cause instanceof Error ? cause.message : "Could not enable notifications."); }
    finally { setRequesting(false); }
  }
  return <TabContent><SettingsScreen
    person={{ id: user?.id || "", name: profile?.displayName || "Your profile", username: profile?.username || "", avatar: profile?.avatarUrl?{uri:profile.avatarUrl}:user?.imageUrl ? { uri: user.imageUrl } : undefined }}
    appearance={appearance} notifications={notifications && permissionGranted === true}
    previews={previews} onPreviews={preferencesReady&&!preferencesBusy?setPreviews:undefined}
    onModeration={snapshot.operator?()=>router.push("/moderation"):undefined}
    preferenceError={permissionError || preferenceError}
    onRetryPreferences={() => { setPermissionError(""); retryPreferences(); }}
    onAppearance={preferencesReady && !preferencesBusy ? setAppearance : undefined}
    onNotifications={preferencesReady && !preferencesBusy && !requesting && permissionGranted !== undefined ? changeNotifications : undefined}
    onProfile={() => router.push("/profile")} onPrivacy={() => router.push("/privacy-and-safety")}
    onSignOut={signOut} signOutReady={isReady}
  /></TabContent>;
}
