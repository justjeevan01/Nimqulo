import { textSize, textLineHeight } from "@/theme/typography";
import { useFonts } from "expo-font";
import { Image, type ImageProps } from "expo-image";
import { useState, useSyncExternalStore } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { backdrop, blueFill, bubbleFill, inboxIcon, panelFill, searchIcon } from "./chat-art";
import { chatFonts } from "./chat-fonts";
import { CreateGroupButton } from "./create-group-button";

export type Conversation = { id: string; title: string; message: string; time?: string; kind: "direct" | "group"; unread?: number; avatar: ImageProps["source"] };
type Props = { conversations: readonly Conversation[]; onFindPeople: () => void; onCreateGroup?:()=>void; onOpenConversation: (conversation: Conversation) => void };
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const filters = ["All", "Direct", "Groups"] as const;

export function ChatHomeScreen({ conversations, onFindPeople, onCreateGroup, onOpenConversation }: Props) {
  const { width, fontScale } = useWindowDimensions();
  const s = Math.min(width, 480) / 390;
  const insets = useSafeAreaInsets();
  const [loaded, fontError] = useFonts(chatFonts);
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [query, setQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [filter, setFilter] = useState<typeof filters[number]>("All");
  const results = conversations.filter(item => (filter === "All" || item.kind === (filter === "Direct" ? "direct" : "group")) && `${item.title} ${item.message}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const text = (size: number, weight: "400" | "500" | "600" | "700" = "400") => ({ fontFamily: loaded ? "InterChats" : undefined, fontSize: textSize(size), fontWeight: weight });
  if (!mounted || (!loaded && !fontError)) return <View style={styles.outer} />;

  return <View style={styles.outer}><View style={styles.canvas}>
    <Image source={backdrop} style={[StyleSheet.absoluteFill, { height: 801 * s }]} contentFit="fill" accessible={false} />
    <View style={{ paddingTop: Math.max(insets.top + 12 * s, 62 * s), paddingHorizontal: 16 * s }}>
      <View style={{ minHeight: 45 * s, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 * s }}>
        <Text accessibilityRole="header" style={[text(38.5, "700"), { color: "#FAFAFC", letterSpacing: -1.2 * s, marginLeft: 3 * s, lineHeight: textLineHeight(45), includeFontPadding: false, textAlignVertical: "center" }]}>Chats</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Search chats" hitSlop={4} accessibilityState={{ expanded: searchVisible }} onPress={() => { if (searchVisible) setQuery(""); setSearchVisible(visible => !visible); }} style={({ pressed }) => [{ width: 45 * s, height: 45 * s, minWidth: 44, minHeight: 44, borderRadius: 24 * s, alignItems: "center", justifyContent: "center", backgroundColor: "#09172A", borderWidth: 1, borderColor: "#152C4B", opacity: pressed ? .65 : 1 }]}><Image source={searchIcon} style={{ width: 20 * s, height: 20 * s }} accessible={false} /></Pressable>
      </View>
      {searchVisible && <View style={{ flexDirection: "row", alignItems: "center", height: 54 * s, minHeight: 48, borderWidth: 1, borderColor: "#1C3454", backgroundColor: "#091523", borderRadius: 23 * s, paddingHorizontal: 18 * s }}>
        <Image source={searchIcon} style={{ width: 21 * s, height: 21 * s, marginRight: 14 * s }} accessible={false} />
        <TextInput autoFocus accessibilityLabel="Search conversations" value={query} onChangeText={setQuery} placeholder="Search conversations..." placeholderTextColor="#8299C5" autoCorrect={false} returnKeyType="search" style={[text(16), { flex: 1, height: "100%", color: "#DCE7FF", outlineWidth: 0, padding: 0 }]} />
        {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={10}><Text style={[text(23), { color: "#A8BBE3" }]}>×</Text></Pressable>}
      </View>}
      <View style={{ flexDirection: "row", gap: 7 * s, marginTop: 15 * s, marginBottom: 15 * s }}>
        {filters.map(name => <Pressable key={name} accessibilityRole="button" hitSlop={{top:3,bottom:3}} accessibilityState={{ selected: filter === name }} onPress={() => setFilter(name)} style={({ pressed }) => [{ flex: name === "All" ? 112 : name === "Direct" ? 115 : 117, height: fontScale > 1.2 ? undefined : 42 * s, minHeight: 42, paddingVertical: fontScale > 1.2 ? 8 : 0, borderRadius: 18 * s, borderWidth: 1, borderColor: filter === name ? "#269CFF" : "#132B48", overflow: "hidden", backgroundColor: "#091626", alignItems: "center", justifyContent: "center", opacity: pressed ? .75 : 1 }]}>
          {filter === name && <Image source={blueFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />}
          <Text style={[text(14, "600"), { color: filter === name ? "white" : "#C2D1F6" }]}>{name}</Text>
        </Pressable>)}
      </View>
      {filter === "Groups" && <View style={{alignItems:"flex-end",marginBottom:12*s}}><CreateGroupButton s={s} onPress={onCreateGroup} fontFamily={loaded ? "InterChats" : undefined}/></View>}
    </View>
    <FlatList data={results} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={results.length ? { paddingHorizontal: 8 * s, paddingBottom: 22 * s, gap: 4 * s } : { flexGrow: 1 }}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${item.message}${item.unread ? `, ${item.unread} unread messages` : ""}`} onPress={() => onOpenConversation(item)} style={({ pressed }) => [{ height: fontScale > 1.2 ? undefined : 82.5 * s, minHeight: 82.5 * s, borderRadius: 17 * s, borderWidth: 1, borderColor: "#0D2034", opacity: pressed ? .75 : 1, backgroundColor: "#071320", overflow: "hidden", paddingHorizontal: 13 * s, paddingVertical: 11 * s, flexDirection: "row", alignItems: "center", gap: 21 * s }]}>
        <Image source={panelFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} pointerEvents="none" />
        <Image source={item.avatar} style={{ width: 58.5 * s, height: 58.5 * s, borderRadius: 30 * s }} contentFit="cover" accessible={false} />
        <View style={{ flex: 1, gap: 5 * s }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 * s }}><Text numberOfLines={1} style={[text(17, "600"), { color: "#F8F9FC", flex: 1, letterSpacing: -.4 * s }]}>{item.title}</Text>{item.time && <Text style={[text(13), { color: "#99AFD8" }]}>{item.time}</Text>}</View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 * s }}><Text numberOfLines={1} style={[text(15), { color: "#90A8D2", flex: 1, letterSpacing: -.3 * s }]}>{item.message}</Text>{!!item.unread && <View style={{ width: 27 * s, height: 27 * s, borderRadius: 14 * s, backgroundColor: "#0067FF", alignItems: "center", justifyContent: "center" }}><Text style={[text(14, "600"), { color: "white" }]}>{item.unread > 99 ? "99+" : item.unread}</Text></View>}</View>
        </View>
      </Pressable>}
      ListEmptyComponent={<View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 * s, paddingTop: 4 * s, minHeight: 370 * s }}>
        <View style={{ width: 111 * s, height: 111 * s, borderRadius: 56 * s, backgroundColor: "#081523", borderWidth: 1, borderColor: "#102741", alignItems: "center", justifyContent: "center" }}><Image source={inboxIcon} style={{ width: 90 * s, height: 73 * s }} accessible={false} /></View>
        <Text accessibilityRole="header" style={[text(22.5, "600"), { color: "#FAFAFC", textAlign: "center", marginTop: 15 * s, letterSpacing: -.5 * s }]}>{query.trim() || filter !== "All" ? "No conversations found" : "No conversations yet"}</Text>
        <Text style={[text(18), { color: "#93AADA", textAlign: "center", lineHeight: textLineHeight(25), marginTop: 9 * s, letterSpacing: -.5 * s }]}>{query.trim() || filter !== "All" ? "Try another search or start\na new conversation." : "Start a conversation with a\ntrusted connection."}</Text>
        <Pressable accessibilityRole="button" onPress={onFindPeople} style={({ pressed }) => [{ width: 269 * s, minHeight: 53 * s, padding: 12 * s, borderRadius: 18 * s, borderWidth: 1, borderColor: "#269CFF", marginTop: 25 * s, alignItems: "center", justifyContent: "center", opacity: pressed ? .75 : 1, overflow: "hidden" }]}><Image source={blueFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} /><Text style={[text(17, "600"), { color: "white" }]}>Find People</Text></Pressable>
      </View>}
    />
    {conversations.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="New conversation" onPress={onFindPeople} style={({ pressed }) => [{ position: "absolute", right: 9 * s, bottom: 18 * s, width: 64 * s, height: 64 * s, alignItems: "center", justifyContent: "center", opacity: pressed ? .75 : 1 }]}><Image source={bubbleFill} style={StyleSheet.absoluteFill} accessible={false} /><View style={{ height: 20 * s, width: 3 * s, backgroundColor: "white", borderRadius: 2 }} /><View style={{ position: "absolute", height: 3 * s, width: 20 * s, backgroundColor: "white", borderRadius: 2 }} /></Pressable>}
  </View></View>;
}
const styles = StyleSheet.create({ outer: { flex: 1, backgroundColor: "#020B18", alignItems: "center" }, canvas: { flex: 1, width: "100%", maxWidth: 480, backgroundColor: "#020C17", overflow: "hidden" } });
