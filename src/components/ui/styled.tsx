import { cssInterop } from "nativewind";
import { View, Text, Pressable } from "react-native";

// Opt in to utility styles without wrapping every existing React Native control.
export const StyledView = cssInterop(View, { className: "style" });
export const StyledText = cssInterop(Text, { className: "style" });
export const StyledPressable = cssInterop(Pressable, { className: "style" });
