import { StyleSheet, Text, View } from "react-native";
import { TabContent } from "@/components/chats/tab-content";

export default function SettingsPreviewRoute() {
  return <TabContent><View style={styles.center}><Text style={styles.title}>Settings preview</Text></View></TabContent>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { color: "white", fontSize: 20, fontWeight: "600" },
});
