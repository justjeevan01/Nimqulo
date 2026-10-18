import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, Text, View } from "react-native";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { useMessenger } from "@/state/messenger";
import { ApiError, type MessageRecord } from "@/lib/backend";
import { readCache, writeCache } from "@/lib/local-cache";
import { DirectMessageScreen, type DirectMessage, type MessageDraft } from "./direct-message-screen";
import { restoreMessages } from "@/lib/message-reconciliation";
import type { MessageReply } from "../../../backend/messenger-types";
import { createTypingSender } from "@/lib/typing";
type Cache={messages:readonly DirectMessage[];draft:string;reply?:MessageReply};
export function ConversationScreen({groupMode=false}:{groupMode?:boolean}){
 const {id}=useLocalSearchParams<{id:string}>();const {api,userId,snapshot,revision,refresh,typing}=useMessenger();
 const [history,setHistory]=useState<readonly DirectMessage[]>();const [initial,setInitial]=useState<Cache>();
 const [before,setBefore]=useState<number|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [denied,setDenied]=useState(false);
 const alive=useRef(true);const loadingRef=useRef(false);const generation=useRef(0);
 const reloadQueued=useRef(false);const [reload,setReload]=useState(0);
 const focused=useIsFocused();const [appActive,setAppActive]=useState(AppState.currentState==="active");
 const [visibleSeq,setVisibleSeq]=useState(0);const acknowledged=useRef(0);const [readAttempt,setReadAttempt]=useState(0);
 useEffect(()=>{const listener=AppState.addEventListener("change",state=>setAppActive(state==="active"));return()=>listener.remove();},[]);
 useEffect(()=>{
   if(!focused||!appActive||!visibleSeq||visibleSeq<=acknowledged.current)return;
   let active=true;let retry:ReturnType<typeof setTimeout>|undefined;
   const timer=setTimeout(()=>{void api.read(id,visibleSeq).then(()=>{if(active)acknowledged.current=Math.max(acknowledged.current,visibleSeq);}).catch(cause=>{if(active&&(!(cause instanceof ApiError)||![401,403,404,409].includes(cause.status)))retry=setTimeout(()=>setReadAttempt(v=>v+1),15000);});},200);
   return()=>{active=false;clearTimeout(timer);if(retry)clearTimeout(retry);};
 },[api,id,focused,appActive,visibleSeq,readAttempt]);
 const conversation=snapshot.conversations.find(c=>c.id===id);const group=snapshot.groups.find(g=>g.id===id);
 const publishTyping=useCallback((value:boolean)=>api.typing(id,value),[api,id]);
 const typingSender=useMemo(()=>createTypingSender(publishTyping),[publishTyping]);
 useEffect(()=>{typingSender.setEnabled(focused&&appActive&&!denied);return()=>typingSender.setEnabled(false);},[typingSender,focused,appActive,denied]);
 const typingNames=focused&&appActive&&!denied?typing.filter(value=>value.conversationId===id&&(group?group.members.some(m=>m.person.id===value.userId):conversation?.peerId===value.userId)).map(value=>value.name):[];
 const convert=useCallback((m:MessageRecord):DirectMessage=>({id:m.id,retryId:m.retryId,seq:m.seq,text:m.text,createdAt:m.createdAt,deleted:m.deleted,reply:m.reply,readBy:m.readBy,recipientCount:m.recipientCount,outgoing:m.authorId===userId,sender:m.sender,time:new Date(m.createdAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}),[userId]);
 useEffect(()=>{let active=true;void readCache<Cache>(userId,`conversation-${id}`).then(cache=>{if(active)setInitial(cache?{...cache,messages:restoreMessages(cache.messages)}:{messages:[],draft:""});});return()=>{active=false;};},[id,userId]);
 const load=useCallback(async(cursor?:number)=>{
  if(loadingRef.current){if(cursor===undefined)reloadQueued.current=true;return;}loadingRef.current=true;const current=++generation.current;
  await Promise.resolve();if(!alive.current){loadingRef.current=false;return;}setLoading(true);
  try{const page=await api.messages(id,cursor);if(!alive.current||current!==generation.current)return;
    setHistory(previous=>cursor?[...page.messages.map(convert),...(previous||[]).filter(m=>!page.messages.some(r=>r.id===m.id))]:page.messages.map(convert));
    setBefore(page.before);setError("");setDenied(false);
  }catch(cause){if(alive.current){setError(cause instanceof Error?cause.message:"Could not load messages.");if(cause instanceof ApiError&&[403,404].includes(cause.status)){setDenied(true);setHistory([]);void writeCache(userId,`conversation-${id}`,{messages:[],draft:""});}}}
  finally{loadingRef.current=false;if(alive.current){setLoading(false);if(reloadQueued.current){reloadQueued.current=false;setReload(value=>value+1);}}}
 },[api,id,convert,userId]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[id]);
 useEffect(()=>{const timeout=setTimeout(()=>void load(),0);return()=>clearTimeout(timeout);},[load,revision,reload]);
 const cache=useCallback((messages:readonly DirectMessage[],draft:string,reply?:MessageReply)=>{if(!denied&&alive.current)void writeCache(userId,`conversation-${id}`,{messages:messages.slice(-250),draft,reply}).catch(()=>{});},[denied,id,userId]);
 const send=useCallback(async(draft:MessageDraft)=>{if(draft.image)throw Error("Only text messages are supported.");const message=await api.sendMessage(id,draft.text,draft.retryId,draft.replyToId);void refresh();return convert(message);},[api,id,refresh,convert]);
 if(!initial)return <View style={{flex:1,backgroundColor:"#020C17",justifyContent:"center"}}><ActivityIndicator color="#008BFF"/></View>;
 if(denied)return <View style={{flex:1,backgroundColor:"#020C17",padding:24,justifyContent:"center",gap:16}}><Text accessibilityRole="alert" style={{color:"white",fontSize:16}}>{error}</Text><Pressable onPress={()=>router.dismissTo("/home")} accessibilityRole="button" style={{minHeight:48}}><Text style={{color:"#79ADFF",fontSize:16}}>Back to chats</Text></Pressable></View>;
 return <View style={{flex:1}}><DirectMessageScreen key={id} peer={{name:conversation?.title||group?.name||"Conversation",username:conversation?.username,avatar:conversation?.avatar}} groupMode={groupMode} members={group?.members.map(m=>m.person)} memberCount={group?.members.length} initialMessages={initial.messages} initialDraft={initial.draft} initialReply={initial.reply} onVisibleMessages={setVisibleSeq} history={history} typingNames={typingNames} onTyping={typingSender.input} onCache={cache} onLoadEarlier={before?()=>void load(before):undefined} loadingEarlier={loading} onBack={()=>router.dismissTo("/home")} onSend={send} onOpenDetails={groupMode?()=>router.push({pathname:"/group-details/[id]",params:{id}}):conversation?.peerId?()=>router.push({pathname:"/profiles/[id]",params:{id:conversation.peerId!}}):undefined} onViewMember={person=>router.push({pathname:"/profiles/[id]",params:{id:person.id}})}/>{!!error&&<Pressable accessibilityRole="button" onPress={()=>void load()} style={{padding:12,backgroundColor:"#291722",minHeight:48}}><Text accessibilityRole="alert" style={{color:"#FFABB4",fontSize:14}}>{error} Tap to retry.</Text></Pressable>}</View>;
}
