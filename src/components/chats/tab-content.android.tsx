import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function TabContent({ children }: PropsWithChildren) {
  const { bottom } = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: "#020B18", paddingBottom: Math.max(bottom, 12) + 100 }}>{children}</View>;
}
