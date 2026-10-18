import { textSize, textLineHeight } from "@/theme/typography";
import { useFonts } from "expo-font";
import { Image, type ImageProps } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { randomUUID } from "expo-crypto";
import { reconcileMessages } from "@/lib/message-reconciliation";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GroupMessage } from "./group-message";
import { MessageBubble, MessageTime } from "./message-bubble";
import { SwipeToReply } from "./swipe-to-reply";
import { ReplyPreview } from "./reply-preview";
import { TypingBubble } from "./typing-bubble";
import { chatDay, chatDateLabel } from "@/lib/chat-presentation";
import type { MessageReply } from "../../../backend/messenger-types";
import type { Person } from "@/components/social/types";
import { chatFonts } from "@/components/chats/chat-fonts";
import { attachmentIcon, backIcon, headerFill, incomingFill, messageBackdrop, moreIcon, outgoingFill, retryIcon, sendIcon } from "./message-art";

export type DirectMessage = { id: string; text: string; outgoing?: boolean; time: string; createdAt?:string;deleted?:boolean;reply?:MessageReply;readBy?:number;recipientCount?:number;groupReceipt?:boolean;image?: ImageProps["source"]; failed?: boolean; pending?:boolean; local?:boolean; retryId?:string; seq?:number; bubbleWidth?: number; sender?: Person; system?: boolean };
export type MessageDraft = { text: string; image?: ImageProps["source"]; retryId:string;replyToId?:string };
type Props = { peer: { name: string; username?: string; avatar?: ImageProps["source"] }; initialMessages?: readonly DirectMessage[]; history?:readonly DirectMessage[]; initialDraft?:string;initialReply?:MessageReply;typingNames?:readonly string[];onTyping?:(typing:boolean)=>void;onVisibleMessages?:(seq:number)=>void;onCache?:(messages:readonly DirectMessage[],draft:string,reply?:MessageReply)=>void; onLoadEarlier?:()=>void; loadingEarlier?:boolean; onBack: () => void; onSend?: (draft: MessageDraft) => Promise<DirectMessage|void>; allowAttachments?:boolean; groupMode?: boolean; memberCount?: number; members?: readonly Person[]; onViewMember?: (person: Person) => void; onOpenDetails?:()=>void };
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function DirectMessageScreen({ peer, initialMessages = [], history, initialDraft="",initialReply,typingNames=[],onTyping,onVisibleMessages,onCache, onLoadEarlier, loadingEarlier, onBack, onSend, allowAttachments=false, groupMode = false, memberCount, members = [], onViewMember, onOpenDetails }: Props) {
  const { width, fontScale } = useWindowDimensions();
  const s = Math.min(width, 480) / 390;
  const insets = useSafeAreaInsets();
  const [loaded, fontError] = useFonts(chatFonts);
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [storedMessages, setMessages] = useState<readonly DirectMessage[]>(initialMessages);
  const messages=useMemo(()=>reconcileMessages(history,storedMessages),[history,storedMessages]);
  const [draft, setDraft] = useState(initialDraft);
  const [reply,setReply]=useState<MessageReply|undefined>(initialReply);
  const input=useRef<ComponentRef<typeof TextInput>>(null);
  const [attachment, setAttachment] = useState<ImageProps["source"]>();
  const [details, setDetails] = useState(false);
  const [viewedImage, setViewedImage] = useState<ImageProps["source"]>();
  const [busy, setBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const list = useRef<ComponentRef<typeof FlatList<DirectMessage>>>(null);
  const sending = useRef(false);
  const pendingScroll = useRef(false);
  const scrollTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const scrollSentMessage=useCallback(()=>{if(!pendingScroll.current)return;if(scrollTimer.current)clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(()=>{pendingScroll.current=false;list.current?.scrollToEnd({animated:true});},200);},[]);
  useEffect(()=>()=>{if(scrollTimer.current)clearTimeout(scrollTimer.current);},[]);
  const historyMoving = useRef(false);
  const lastHistoryScroll = useRef(0);
  const photoTouch = useRef({ x: 0, y: 0, cancelled: false });
  useEffect(()=>{const timeout=setTimeout(()=>onCache?.(messages,draft,reply),200);return()=>clearTimeout(timeout);},[messages,draft,reply,onCache]);
  const scrolling=useCallback(()=>historyMoving.current||Date.now()-lastHistoryScroll.current<150,[]);
  const chooseReply=useCallback((message:DirectMessage)=>{if(!message.seq||message.pending||message.failed||message.system||message.deleted)return;setReply({id:message.id,authorId:message.sender?.id||"",name:message.outgoing?"You":message.sender?.name||peer.name,text:message.text.slice(0,240)});input.current?.focus();},[peer.name]);
  const viewability=useMemo(()=>({itemVisiblePercentThreshold:65,minimumViewTime:300}),[]);
  const visibleMessages=useCallback(({viewableItems}:{viewableItems:{item:DirectMessage;isViewable:boolean}[]})=>{const positions=viewableItems.filter(v=>v.isViewable&&!v.item.outgoing&&!v.item.pending&&!v.item.failed).map(v=>v.item.seq||0);onVisibleMessages?.(Math.max(0,...positions));},[onVisibleMessages]);
  function cancelPhotoTap() {
    photoTouch.current.cancelled = true;
    lastHistoryScroll.current = Date.now();
  }
  const failure = messages.findLast(message => message.failed);
  const fontFamily = loaded ? "InterChats" : undefined;

  async function deliver(message: DirectMessage) {
    if (!onSend || sending.current) return;
    sending.current = true; setBusy(true);
    setMessages(current=>current.map(item=>item.id===message.id?{...item,pending:true,failed:false}:item));
    try {
      const committed=await onSend({ text: message.text, image: message.image, retryId:message.retryId||message.id,replyToId:message.reply?.id });
      setMessages(current => {const remaining=current.filter(item=>item.id!==message.id&&item.retryId!==message.retryId);return [...remaining,committed?{...committed,local:true}:{...message,pending:false,failed:false}];});
    } catch {
      setMessages(current => current.map(item => item.id === message.id ? { ...item, pending:false, failed: true } : item));
    } finally { sending.current = false; setBusy(false); }
  }
  function sendDraft() {
    if (!onSend || sending.current || (!draft.trim() && !attachment)) return;
    onTyping?.(false);
    const retryId=randomUUID();
    const now=new Date();
    const message: DirectMessage = { id: retryId, retryId, pending:true, text: draft.trim(),reply, image: attachment, outgoing: true,createdAt:now.toISOString(), time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) };
    pendingScroll.current = true;
    setMessages(current => [...current, message]); onCache?.([...messages,message],""); setDraft("");setReply(undefined); setAttachment(undefined);
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
          {peer.avatar ? <Image source={peer.avatar} contentFit="cover" style={{ width: 55 * s, height: 55 * s, borderRadius: 30 * s, borderWidth: 1, borderColor: "#5685B3" }} accessibilityLabel={`${peer.name}'s profile photo`} /> : <View style={[styles.avatar, { width: 55 * s, height: 55 * s }]}><Text style={{ fontFamily, fontSize: textSize(24), color: "#CBDCFA" }}>{peer.name.slice(0, 1)}</Text></View>}
          <View style={{ flex: 1, marginLeft: 9 * s, gap: 3 * s }}><Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily, fontSize: textSize(19), lineHeight: textLineHeight(25), fontWeight: "600", color: "#F8F9FF", letterSpacing: -.3 * s }}>{peer.name}</Text>{(!!peer.username || groupMode) && <Text numberOfLines={1} style={{ fontFamily, fontSize: textSize(13), lineHeight: textLineHeight(18), color: "#91A8D0" }}>{groupMode ? (memberCount === undefined ? "Group" : `${memberCount} members`) : `@${peer.username}`}</Text>}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Conversation options" onPress={() => { if(onOpenDetails)onOpenDetails();else setDetails(true); }} style={styles.iconButton}><Image source={moreIcon} style={{ width: 24 * s, height: 24 * s }} accessible={false} /></Pressable>
        </View>
      </View>
      <FlatList ref={list} data={messages} keyExtractor={item => item.id} style={styles.history} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.messages, { paddingTop: 9 * s, paddingBottom: 8 * s, paddingLeft: 17 * s, paddingRight: 13 * s, gap: 5 * s }]}
        viewabilityConfig={viewability} onViewableItemsChanged={visibleMessages}
        onScrollBeginDrag={() => { historyMoving.current = true; cancelPhotoTap(); }}
        onScrollEndDrag={() => { historyMoving.current = false; cancelPhotoTap(); }}
        onMomentumScrollBegin={() => { historyMoving.current = true; cancelPhotoTap(); }}
        onMomentumScrollEnd={() => { historyMoving.current = false; cancelPhotoTap(); }}
        onScroll={cancelPhotoTap} scrollEventThrottle={16}
        onContentSizeChange={scrollSentMessage} onLayout={scrollSentMessage}
        ListHeaderComponent={onLoadEarlier?<Pressable accessibilityRole="button" disabled={loadingEarlier} onPress={onLoadEarlier} style={{minHeight:48,alignItems:"center",justifyContent:"center"}}><Text style={{color:"#99AED6",fontSize:14}}>{loadingEarlier?"Loading…":"Load earlier messages"}</Text></Pressable>:undefined}
        renderItem={({ item,index }) => <View>
          {!!chatDay(item.createdAt)&&chatDay(item.createdAt)!==chatDay(messages[index-1]?.createdAt)&&<View style={{alignItems:"center",paddingVertical:10*s}}><Text accessibilityRole="header" style={[styles.day,{fontFamily,fontSize:textSize(12),lineHeight:textLineHeight(17),color:"#A8BFE5",paddingHorizontal:13*s,paddingVertical:5*s,borderRadius:99}]}>{chatDateLabel(item.createdAt!)}</Text></View>}
          <SwipeToReply label={`${item.sender?.name||peer.name}: ${item.text}`} disabled={!onSend||!item.seq||item.system||item.deleted||item.pending||item.failed} isScrolling={scrolling} onReply={()=>chooseReply(item)}>
          {groupMode ? <GroupMessage message={item} s={s} fontFamily={fontFamily} fontScale={fontScale} renderPhoto={renderPhoto} onProfile={onViewMember}/> : <View style={{ alignItems: item.outgoing ? "flex-end" : "flex-start" }}>
          <MessageBubble message={item} s={s} fontFamily={fontFamily} fontScale={fontScale} renderPhoto={renderPhoto}/>
          <MessageTime time={item.pending?"Sending…":item.time} outgoing={item.outgoing} s={s} fontFamily={fontFamily} message={item}/>
        </View>}</SwipeToReply></View>}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ fontFamily, fontSize: textSize(16), color: "#91A8D0" }}>No messages yet</Text></View>}
        ListFooterComponent={failure ? <Pressable accessibilityRole="button" accessibilityLabel="Retry sending message" accessibilityState={{ disabled: busy || !onSend, busy }} disabled={busy || !onSend} onPress={() => void deliver(failure)} style={[styles.failure, { marginLeft: 16 * s, marginRight: 0, minHeight: 57 * s, borderRadius: 18 * s, paddingHorizontal: 16 * s, gap: 20 * s }]}>
          <View style={[styles.warning, { width: 22 * s, height: 22 * s }]}><Text style={{ fontFamily, fontSize: textSize(17), lineHeight: textLineHeight(21), color: "white", fontWeight: "600" }}>!</Text></View>
          <Text accessibilityLiveRegion="polite" style={{ flex: 1, fontFamily, fontSize: textSize(14), lineHeight: textLineHeight(20), letterSpacing: -.2 * s, color: "#FF4353" }}>This message failed to send.{"\n"}Tap to retry</Text>
          <View style={[styles.retry, { width: 36 * s, height: 36 * s }]}>{busy ? <ActivityIndicator color="#FF4D5B" /> : <Image source={retryIcon} style={{ width: 24 * s, height: 24 * s }} accessible={false} />}</View>
        </Pressable> : undefined}
      />
      {!!typingNames.length&&<View style={{paddingHorizontal:17*s}}><TypingBubble names={typingNames} s={s} fontFamily={fontFamily} groupMode={groupMode}/></View>}
      <View style={[styles.composer, { paddingHorizontal: 10 * s, paddingTop: 10 * s, paddingBottom: Math.max(insets.bottom, 20 * s), gap: 8 * s }]}>
        {reply&&<View style={{flexDirection:"row",alignItems:"center",paddingHorizontal:5*s}}><View style={{flex:1}}><ReplyPreview reply={reply} fontFamily={fontFamily}/></View><Pressable accessibilityRole="button" accessibilityLabel="Cancel reply" onPress={()=>setReply(undefined)} style={styles.iconButton}><Text style={{fontSize:textSize(23),color:"#B8CCEF"}}>×</Text></Pressable></View>}
        {!!attachmentError && <Text accessibilityRole="alert" style={{ fontFamily, color: "#FF7885", fontSize: textSize(13) }}>{attachmentError}</Text>}
        {attachment && <View style={styles.attachment}><Image source={attachment} style={{ width: 64 * s, height: 48 * s, borderRadius: 10 * s }} contentFit="cover" accessibilityLabel="Selected attachment" /><Pressable accessibilityRole="button" accessibilityLabel="Remove attachment" onPress={() => setAttachment(undefined)} style={styles.iconButton}><Text style={{ color: "#DBE6FF", fontSize: textSize(24) }}>{"\u00D7"}</Text></Pressable></View>}
        <View style={[styles.composerRow, { gap: 9 * s }]}>
          {allowAttachments&&<Pressable accessibilityRole="button" accessibilityLabel="Attach photo" disabled={!onSend || busy} onPress={chooseAttachment} style={[styles.attachButton, { width: 44 * s, height: 44 * s }]}><Image source={attachmentIcon} style={{ width: 26 * s, height: 26 * s }} accessible={false} /></Pressable>}
          <View style={[styles.inputContainer, { minHeight: 44 * s, borderRadius: 24 * s }]}><Image source={incomingFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} /><TextInput ref={input} accessibilityLabel="Message" placeholder="Message..." placeholderTextColor="#8196BF" value={draft} onChangeText={value=>{setDraft(value);onTyping?.(!!value.trim());}} onBlur={()=>onTyping?.(false)} editable={!!onSend} multiline maxLength={4000} style={{ fontFamily, fontSize: textSize(15), lineHeight: textLineHeight(20), color: "#E9F0FF", paddingHorizontal: 17 * s, paddingVertical: 10 * s, maxHeight: 120 * s, outlineWidth: 0 }} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !onSend || busy || (!draft.trim() && !attachment) }} disabled={!onSend || busy || (!draft.trim() && !attachment)} onPress={sendDraft} style={[styles.sendButton, { width: 44 * s, height: 44 * s }]}><Image source={outgoingFill} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} /><Image source={sendIcon} style={{ width: 24 * s, height: 24 * s }} accessible={false} /></Pressable>
        </View>
      </View>
      <Modal visible={details} transparent animationType="fade" onRequestClose={() => setDetails(false)}><View style={styles.modalOverlay}><View style={styles.details}><Text style={[styles.modalTitle, { fontFamily }]}>{peer.name}</Text>{!!peer.username && <Text style={{ fontFamily, color: "#91A8D0", fontSize: textSize(16) }}>{groupMode ? (memberCount === undefined ? "Group" : `${memberCount} members`) : `@${peer.username}`}</Text>}{groupMode && members.map(member => <Pressable key={member.id} accessibilityRole="button" accessibilityLabel={`View ${member.name}'s profile`} onPress={() => { setDetails(false); onViewMember?.(member); }} style={{minHeight:44,justifyContent:"center"}}><Text style={{fontFamily,color:"#BCD1F7",fontSize:textSize(16)}}>{member.name}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel="Close conversation options" onPress={() => setDetails(false)} style={styles.close}><Text style={{ fontFamily, color: "white", fontSize: textSize(16) }}>Close</Text></Pressable></View></View></Modal>
      <Modal visible={!!viewedImage} animationType="fade" onRequestClose={() => setViewedImage(undefined)}><View style={styles.photoViewer}><Image source={viewedImage} contentFit="contain" style={StyleSheet.absoluteFill} accessibilityLabel="Shared photo full screen" /><Pressable accessibilityRole="button" accessibilityLabel="Close photo" onPress={() => setViewedImage(undefined)} style={[styles.photoClose, { top: insets.top + 12 }]}><Text style={{ color: "white", fontSize: textSize(26) }}>{"\u00D7"}</Text></Pressable></View></Modal>
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
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#000B" }, details: { padding: 24, gap: 12, borderRadius: 24, backgroundColor: "#10223B", width: "100%", maxWidth: 340 }, modalTitle: { fontSize: textSize(22), color: "white", fontWeight: "600" }, close: { marginTop: 12, minHeight: 44, borderRadius: 22, backgroundColor: "#086BFF", alignItems: "center", justifyContent: "center" }, photoViewer: { flex: 1, backgroundColor: "#020710" }, photoClose: { position: "absolute", right: 20, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#132339" },
});
