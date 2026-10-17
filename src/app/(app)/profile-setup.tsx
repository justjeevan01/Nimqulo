import { useClerk, useUser } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ProfileSetupScreen } from "@/components/profile/profile-setup-screen";
import { isAccountApproved } from "@/lib/access";

export default function ProfileSetupRoute() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  if (!isLoaded || !user) return <View style={styles.loading}><ActivityIndicator color="#008BFF" /></View>;
  if (!isAccountApproved(user)) return <Redirect href="/access-required" />;

  async function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      await signOut();
      router.replace("/");
    }
  }

  return <ProfileSetupScreen initialImageSource={user.hasImage ? { uri: user.imageUrl } : undefined} onConfirm={() => router.replace("/home")} onBack={goBack} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: "#020B18", justifyContent: "center", alignItems: "center" } });
