import { useFonts } from "expo-font";
import { Image, type ImageProps } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { type ComponentRef, useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GroupMessage } from "./group-message";
import { MessageBubble, MessageTime } from "./message-bubble";
import type { Person } from "@/components/social/types";
import { chatFonts } from "@/components/chats/chat-fonts";
import { attachmentIcon, backIcon, headerFill, incomingFill, messageBackdrop, moreIcon, outgoingFill, retryIcon, sendIcon } from "./message-art";

export type DirectMessage = { id: string; text: string; outgoing?: boolean; time: string; image?: ImageProps["source"]; failed?: boolean; bubbleWidth?: number; sender?: Person; system?: boolean };
export type MessageDraft = { text: string; image?: ImageProps["source"] };
type Props = { peer: { name: string; username?: string; avatar?: ImageProps["source"] }; initialMessages?: readonly DirectMessage[]; onBack: () => void; onSend?: (draft: MessageDraft) => Promise<void>; groupMode?: boolean; memberCount?: number; members?: readonly Person[]; onViewMember?: (person: Person) => void };
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function DirectMessageScreen({ peer, initialMessages = [], onBack, onSend, groupMode = false, memberCount, members = [], onViewMember }: Props) {
  const { width, fontScale } = useWindowDimensions();
  const s = Math.min(width, 480) / 390;
  const insets = useSafeAreaInsets();
  const [loaded, fontError] = useFonts(chatFonts);
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [messages, setMessages] = useState<readonly DirectMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<ImageProps["source"]>();
  const [details, setDetails] = useState(false);
  const [viewedImage, setViewedImage] = useState<ImageProps["source"]>();
  const [busy, setBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const list = useRef<ComponentRef<typeof FlatList<DirectMessage>>>(null);
  const sending = useRef(false);
  const pendingScroll = useRef(false);
  const historyMoving = useRef(false);
  const lastHistoryScroll = useRef(0);
  const photoTouch = useRef({ x: 0, y: 0, cancelled: false });
  function cancelPhotoTap() {
    photoTouch.current.cancelled = true;
    lastHistoryScroll.current = Date.now();
  }
  const failure = messages.findLast(message => message.failed);
  const fontFamily = loaded ? "InterChats" : undefined;

  async function deliver(message: DirectMessage) {
    if (!onSend || sending.current) return;
    sending.current = true; setBusy(true);
    try {
      await onSend({ text: message.text, image: message.image });
      setMessages(current => current.map(item => item.id === message.id ? { ...item, failed: false } : item));
    } catch {
      setMessages(current => current.map(item => item.id === message.id ? { ...item, failed: true } : item));
    } finally { sending.current = false; setBusy(false); }
  }
  function sendDraft() {
    if (!onSend || sending.current || (!draft.trim() && !attachment)) return;
    const message: DirectMessage = { id: `local-${Date.now()}`, text: draft.trim(), image: attachment, outgoing: true, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) };
    pendingScroll.current = true;
    setMessages(current => [...current, message]); setDraft(""); setAttachment(undefined);
    void deliver(message);
  }
  async function chooseAttachment() {
    if (!onSend || sending.current) return;
    setAttachmentError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: .85 });
      if (!result.canceled) setAttachment({ uri: result.assets[0].uri });
    } catch { setAttachmentError("Couldn't open your photos. Please try again."); }
  }
  function renderPhoto(image: ImageProps["source"], aspect = 518 / 268) {
    return <Pressable accessibilityRole="button" accessibilityLabel="Open shared photo" onPressIn={event => {
                photoTouch.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, cancelled: historyMoving.current || Date.now() - lastHistoryScroll.current < 150 };
              }} onTouchMove={event => {
                const touch = photoTouch.current;
                if (Math.hypot(event.nativeEvent.pageX - touch.x, event.nativeEvent.pageY - touch.y) > 8) touch.cancelled = true;
              }} onTouchCancel={() => { photoTouch.current.cancelled = true; }} onAccessibilityTap={() => setViewedImage(image)} onPress={event => {
                const touch = photoTouch.current;
                const moved = Math.hypot(event.nativeEvent.pageX - touch.x, event.nativeEvent.pageY - touch.y) > 8;
                if (!touch.cancelled && !moved && !historyMoving.current) setViewedImage(image);
              }}><Image source={image} contentFit="cover" style={{ width: "100%", aspectRatio: aspect, borderRadius: 14 * s }} accessibilityLabel="Shared photo" /></Pressable>;
  }
  if (!mounted || (!loaded && !fontError)) return <View style={styles.root} />;

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <View style={styles.canvas}>
      <Image source={messageBackdrop} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 48 * s), paddingBottom: 8 * s, paddingHorizontal: 8 * s }]}>
        <Image source={headerFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
        <View style={[styles.headerRow, { gap: 6 * s, minHeight: 55 * s }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to chats" onPress={onBack} style={[styles.iconButton, { width: 38 * s }]}><Image source={backIcon} style={{ width: 26 * s, height: 26 * s }} accessible={false} /></Pressable>
          {peer.avatar ? <Image source={peer.avatar} contentFit="cover" style={{ width: 55 * s, height: 55 * s, borderRadius: 30 * s, borderWidth: 1, borderColor: "#5685B3" }} accessibilityLabel={`${peer.name}'s profile photo`} /> : <View style={[styles.avatar, { width: 55 * s, height: 55 * s }]}><Text style={{ fontFamily, fontSize: 24 * s, color: "#CBDCFA" }}>{peer.name.slice(0, 1)}</Text></View>}
          <View style={{ flex: 1, marginLeft: 9 * s, gap: 3 * s }}><Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily, fontSize: 19 * s, lineHeight: 25 * s, fontWeight: "600", color: "#F8F9FF", letterSpacing: -.3 * s }}>{peer.name}</Text>{(!!peer.username || groupMode) && <Text numberOfLines={1} style={{ fontFamily, fontSize: 13 * s, lineHeight: 18 * s, color: "#91A8D0" }}>{groupMode ? (memberCount === undefined ? "Group" : `${memberCount} members`) : `@${peer.username}`}</Text>}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Conversation options" onPress={() => setDetails(true)} style={styles.iconButton}><Image source={moreIcon} style={{ width: 24 * s, height: 24 * s }} accessible={false} /></Pressable>
        </View>
      </View>
      <FlatList ref={list} data={messages} keyExtractor={item => item.id} style={styles.history} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.messages, { paddingTop: 9 * s, paddingBottom: 8 * s, paddingLeft: 17 * s, paddingRight: 13 * s, gap: 5 * s }]}
        onScrollBeginDrag={() => { historyMoving.current = true; cancelPhotoTap(); }}
        onScrollEndDrag={() => { historyMoving.current = false; cancelPhotoTap(); }}
        onMomentumScrollBegin={() => { historyMoving.current = true; cancelPhotoTap(); }}
        onMomentumScrollEnd={() => { historyMoving.current = false; cancelPhotoTap(); }}
        onScroll={cancelPhotoTap} scrollEventThrottle={16}
        onContentSizeChange={() => { if (pendingScroll.current) { pendingScroll.current = false; list.current?.scrollToEnd({ animated: true }); } }}
        ListHeaderComponent={messages.length && !groupMode ? <View style={{ alignItems: "center", paddingBottom: 1 * s }}><View style={[styles.day, { paddingHorizontal: 23 * s, paddingVertical: 3 * s, borderRadius: 15 * s }]}><Text style={{ fontFamily, fontSize: 12 * s, lineHeight: 16 * s, color: "#99AED6" }}>Today</Text></View></View> : undefined}
        renderItem={({ item }) => groupMode ? <GroupMessage message={item} s={s} fontFamily={fontFamily} fontScale={fontScale} renderPhoto={renderPhoto} onProfile={onViewMember}/> : <View style={{ alignItems: item.outgoing ? "flex-end" : "flex-start" }}>
          <MessageBubble message={item} s={s} fontFamily={fontFamily} fontScale={fontScale} renderPhoto={renderPhoto}/>
          <MessageTime time={item.time} outgoing={item.outgoing} s={s} fontFamily={fontFamily}/>
        </View>}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ fontFamily, fontSize: 16 * s, color: "#91A8D0" }}>No messages yet</Text></View>}
        ListFooterComponent={failure ? <Pressable accessibilityRole="button" accessibilityLabel="Retry sending message" accessibilityState={{ disabled: busy || !onSend, busy }} disabled={busy || !onSend} onPress={() => void deliver(failure)} style={[styles.failure, { marginLeft: 16 * s, marginRight: 0, minHeight: 57 * s, borderRadius: 18 * s, paddingHorizontal: 16 * s, gap: 20 * s }]}>
          <View style={[styles.warning, { width: 22 * s, height: 22 * s }]}><Text style={{ fontFamily, fontSize: 17 * s, lineHeight: 21 * s, color: "white", fontWeight: "600" }}>!</Text></View>
          <Text accessibilityLiveRegion="polite" style={{ flex: 1, fontFamily, fontSize: 14 * s, lineHeight: 20 * s, letterSpacing: -.2 * s, color: "#FF4353" }}>This message failed to send.{"\n"}Tap to retry</Text>
          <View style={[styles.retry, { width: 36 * s, height: 36 * s }]}>{busy ? <ActivityIndicator color="#FF4D5B" /> : <Image source={retryIcon} style={{ width: 24 * s, height: 24 * s }} accessible={false} />}</View>
        </Pressable> : undefined}
      />
      <View style={[styles.composer, { paddingHorizontal: 10 * s, paddingTop: 10 * s, paddingBottom: Math.max(insets.bottom, 20 * s), gap: 8 * s }]}>
        {!!attachmentError && <Text accessibilityRole="alert" style={{ fontFamily, color: "#FF7885", fontSize: 13 }}>{attachmentError}</Text>}
        {attachment && <View style={styles.attachment}><Image source={attachment} style={{ width: 64 * s, height: 48 * s, borderRadius: 10 * s }} contentFit="cover" accessibilityLabel="Selected attachment" /><Pressable accessibilityRole="button" accessibilityLabel="Remove attachment" onPress={() => setAttachment(undefined)} style={styles.iconButton}><Text style={{ color: "#DBE6FF", fontSize: 24 }}>{"\u00D7"}</Text></Pressable></View>}
        <View style={[styles.composerRow, { gap: 9 * s }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Attach photo" disabled={!onSend || busy} onPress={chooseAttachment} style={[styles.attachButton, { width: 44 * s, height: 44 * s }]}><Image source={attachmentIcon} style={{ width: 26 * s, height: 26 * s }} accessible={false} /></Pressable>
          <View style={[styles.inputContainer, { minHeight: 44 * s, borderRadius: 24 * s }]}><Image source={incomingFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} /><TextInput accessibilityLabel="Message" placeholder="Message..." placeholderTextColor="#8196BF" value={draft} onChangeText={setDraft} editable={!!onSend} multiline maxLength={4000} style={{ fontFamily, fontSize: 15 * s, lineHeight: 20 * s, color: "#E9F0FF", paddingHorizontal: 17 * s, paddingVertical: 10 * s, maxHeight: 120 * s, outlineWidth: 0 }} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !onSend || busy || (!draft.trim() && !attachment) }} disabled={!onSend || busy || (!draft.trim() && !attachment)} onPress={sendDraft} style={[styles.sendButton, { width: 44 * s, height: 44 * s }]}><Image source={outgoingFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} /><Image source={sendIcon} style={{ width: 24 * s, height: 24 * s }} accessible={false} /></Pressable>
        </View>
      </View>
      <Modal visible={details} transparent animationType="fade" onRequestClose={() => setDetails(false)}><View style={styles.modalOverlay}><View style={styles.details}><Text style={[styles.modalTitle, { fontFamily }]}>{peer.name}</Text>{!!peer.username && <Text style={{ fontFamily, color: "#91A8D0", fontSize: 16 }}>{groupMode ? (memberCount === undefined ? "Group" : `${memberCount} members`) : `@${peer.username}`}</Text>}{groupMode && members.map(member => <Pressable key={member.id} accessibilityRole="button" accessibilityLabel={`View ${member.name}'s profile`} onPress={() => { setDetails(false); onViewMember?.(member); }} style={{minHeight:44,justifyContent:"center"}}><Text style={{fontFamily,color:"#BCD1F7",fontSize:16}}>{member.name}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel="Close conversation options" onPress={() => setDetails(false)} style={styles.close}><Text style={{ fontFamily, color: "white", fontSize: 16 }}>Close</Text></Pressable></View></View></Modal>
      <Modal visible={!!viewedImage} animationType="fade" onRequestClose={() => setViewedImage(undefined)}><View style={styles.photoViewer}><Image source={viewedImage} contentFit="contain" style={StyleSheet.absoluteFill} accessibilityLabel="Shared photo full screen" /><Pressable accessibilityRole="button" accessibilityLabel="Close photo" onPress={() => setViewedImage(undefined)} style={[styles.photoClose, { top: insets.top + 12 }]}><Text style={{ color: "white", fontSize: 26 }}>{"\u00D7"}</Text></Pressable></View></Modal>
    </View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020C17", alignItems: "center" },
  canvas: { flex: 1, width: "100%", maxWidth: 480, backgroundColor: "#020C17" },
  header: { borderBottomWidth: 1, borderColor: "#0F2136" }, headerRow: { flexDirection: "row", alignItems: "center" },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  avatar: { borderRadius: 99, alignItems: "center", justifyContent: "center", backgroundColor: "#17304C" },
  history: { flex: 1 }, messages: { flexGrow: 1, justifyContent: "space-between" }, day: { backgroundColor: "#0B1829", borderWidth: 1, borderColor: "#12243A" },
  bubble: { overflow: "hidden", borderWidth: 1 }, empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  failure: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#69212D", backgroundColor: "#24131E" }, warning: { borderRadius: 99, backgroundColor: "#FF3447", alignItems: "center", justifyContent: "center" }, retry: { borderRadius: 99, alignItems: "center", justifyContent: "center", backgroundColor: "#1A101F" },
  composer: { borderTopWidth: 1, borderColor: "#102237", backgroundColor: "#030D19" }, composerRow: { flexDirection: "row", alignItems: "flex-end" },
  attachButton: { minWidth: 44, minHeight: 44, borderRadius: 99, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1B2D44", backgroundColor: "#111F32" },
  inputContainer: { flex: 1, borderWidth: 1, borderColor: "#263D5B", overflow: "hidden" }, sendButton: { minWidth: 44, minHeight: 44, borderRadius: 99, backgroundColor: "#0068FF", borderWidth: 1, borderColor: "#2288FF", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  attachment: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#000B" }, details: { padding: 24, gap: 12, borderRadius: 24, backgroundColor: "#10223B", width: "100%", maxWidth: 340 }, modalTitle: { fontSize: 22, color: "white", fontWeight: "600" }, close: { marginTop: 12, minHeight: 44, borderRadius: 22, backgroundColor: "#086BFF", alignItems: "center", justifyContent: "center" }, photoViewer: { flex: 1, backgroundColor: "#020710" }, photoClose: { position: "absolute", right: 20, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#132339" },
});
