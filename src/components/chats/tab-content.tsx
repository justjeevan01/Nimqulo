import type { PropsWithChildren } from "react";
import { SafeAreaView } from "react-native-screens/experimental";

// Includes the system tab bar's inset on both platforms. Headers handle their own top inset.
// Paired with disableAutomaticContentInsets to keep the chat list and floating action visible.
export function TabContent({ children }: PropsWithChildren) {
  return <SafeAreaView edges={{ bottom: true }} style={{ flex: 1, backgroundColor: "#020B18" }}>{children}</SafeAreaView>;
}
