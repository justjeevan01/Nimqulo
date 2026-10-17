import type { PropsWithChildren } from "react";
import { View } from "react-native";

export function TabContent({ children }: PropsWithChildren) {
  return <View style={{ flex: 1, backgroundColor: "#020B18", paddingBottom: 112 }}>{children}</View>;
}
