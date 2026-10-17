import { useClerk, useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export function SessionScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch {
      setError("We couldn’t sign you out. Please try again.");
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.root}>
      <View style={styles.content}>
        <Image source={require("../../../assets/auth/logo.png")} style={styles.logo} contentFit="contain" accessible={false} />
        <Text accessibilityRole="header" style={styles.title}>Welcome{typeof user?.unsafeMetadata.displayName === "string" ? `, ${user.unsafeMetadata.displayName}` : user?.firstName ? `, ${user.firstName}` : " to Nimqulo"}.</Text>
        <Text style={styles.subtitle}>You’re signed in with Google.</Text>
        <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push("/profile-setup")} style={styles.button}><Text style={styles.buttonLabel}>Edit profile</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={isSigningOut} accessibilityState={{ disabled: isSigningOut, busy: isSigningOut }} onPress={handleSignOut} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          {isSigningOut ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonLabel}>Sign out</Text>}
        </Pressable>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020B18", justifyContent: "center", alignItems: "center", padding: 24 },
  content: { width: "100%", maxWidth: 400, alignItems: "center", gap: 16 },
  logo: { width: 80, height: 80, marginBottom: 16 },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "600", textAlign: "center" },
  subtitle: { color: "#A5B6D6", fontSize: 17, textAlign: "center" },
  email: { color: "#7F91B5", fontSize: 15, textAlign: "center" },
  button: { minHeight: 52, alignSelf: "stretch", justifyContent: "center", alignItems: "center", borderRadius: 99, borderWidth: 1, borderColor: "#587395", padding: 16, marginTop: 24 },
  pressed: { backgroundColor: "#13243B" },
  buttonLabel: { color: "#FFFFFF", fontSize: 17, fontWeight: "500" },
  error: { color: "#FFAFB6", textAlign: "center", lineHeight: 20 },
});
