import type { PropsWithChildren } from "react";
import { SafeAreaView } from "react-native-screens/experimental";

// Native tabs supply their own bottom inset; do not reserve space for the old floating dock.
export function TabContent({ children }: PropsWithChildren) {
  return <SafeAreaView edges={{ bottom: true }} style={{ flex: 1, backgroundColor: "#020B18" }}>{children}</SafeAreaView>;
}
