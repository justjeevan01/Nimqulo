import { useAuth, useUser } from "@clerk/expo";
import { Redirect, router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ProfileSetupScreen } from "@/components/profile/profile-setup-screen";
import { isAccountApproved } from "@/lib/access";
import { useProfile } from "@/state/profile";
import { useEffect, useState } from "react";
import { readCache, writeCache } from "@/lib/local-cache";
import { useAppSignOut } from "@/hooks/use-app-sign-out";

export default function ProfileSetupRoute() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAppSignOut();
  const {sessionId}=useAuth();
  const { profile, save } = useProfile();
  const [confirmed,setConfirmed]=useState<string>();
  useEffect(()=>{let active=true;if(user)void readCache<string>(user.id,"confirmed-session").then(value=>{if(active)setConfirmed(value||"");});return()=>{active=false;};},[user]);
  if (!isLoaded || !user) return <View style={styles.loading}><ActivityIndicator color="#008BFF" /></View>;
  if (!isAccountApproved(user)) return <Redirect href="/access-required" />;
  if(profile&&confirmed===sessionId)return <Redirect href="/home"/>;

  async function goBack() {
    if (profile && router.canGoBack()) {
      router.back();
    } else {
      await signOut();
    }
  }

  return <ProfileSetupScreen initialProfile={profile} initialImageSource={user.hasImage ? { uri: user.imageUrl } : undefined} onUploadPhoto={async file => {
    try { await user.setProfileImage({ file }); await user.reload(); }
    catch { throw new Error("Could not upload your photo. Check your connection and try again, or continue without it."); }
  }} onConfirm={async value => { await save(value);await writeCache(user.id,"confirmed-session",sessionId); router.replace("/home"); }} onBack={goBack} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: "#020B18", justifyContent: "center", alignItems: "center" } });
