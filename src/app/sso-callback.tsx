import { useAuth, useUser } from "@clerk/expo";
import { Link, Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getPostSignInRoute } from "@/lib/access";

export default function SSOCallbackRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  if (isLoaded && userLoaded && isSignedIn) return <Redirect href={getPostSignInRoute(user)} />;
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#008BFF" />
      <Text style={styles.text}>Completing sign-in…</Text>
      <Link href="/" replace style={styles.link}>Return to sign in</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020B18", alignItems: "center", justifyContent: "center", gap: 20 },
  text: { color: "#A5B6D6", fontSize: 17 },
  link: { color: "#008BFF", fontSize: 16, padding: 16 },
});
