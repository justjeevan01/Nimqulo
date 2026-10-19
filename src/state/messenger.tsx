import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { useAuth,useUser } from "@/state/auth";
import { useBackend } from "@/hooks/use-backend";
import { readCache, writeCache, removeCache, clearPrivateCache } from "@/lib/local-cache";
import { ApiError, setAccessFailureHandler, type Snapshot } from "@/lib/backend";
import { router, usePathname } from "expo-router";
import { observeMessageNotifications } from "@/lib/notifications";
import { applyTypingActivity, type TypingActivity } from "@/lib/typing";
import { pendingPeopleActivity } from "@/lib/people-activity";
const empty:Snapshot={people:[],requests:[],groups:[],invitations:[],blocked:[],conversations:[],operator:false};
function useMessengerState(){
  const api=useBackend();const {user}=useUser();const userId=user!.id;
  const pathname=usePathname();
  const [notificationId,setNotificationId]=useState<string>();
  const [snapshot,setSnapshot]=useState(empty);const [ready,setReady]=useState(false);const [error,setError]=useState("");const [revision,setRevision]=useState(0);
  const [typing,setTyping]=useState<readonly TypingActivity[]>([]);
  useEffect(()=>{if(!typing.length)return;const timer=setInterval(()=>setTyping(current=>current.filter(value=>value.expiresAt>Date.now())),1000);return()=>clearInterval(timer);},[typing.length]);
  const alive=useRef(true);const pending=useRef<Promise<void>|undefined>(undefined);
  const latestSnapshot=useRef(empty);
  const notificationTarget=useRef<string|undefined>(undefined);
  const openNotification=useCallback(async(id:string)=>{
    notificationTarget.current=id;
    try{const conversation=await api.conversationAccess(id);if(alive.current&&notificationTarget.current===id){notificationTarget.current=undefined;setNotificationId(undefined);setError("");router.push({pathname:conversation.kind==="group"?"/groups/[id]":"/messages/[id]",params:{id}});}}
    catch(cause){if(alive.current&&notificationTarget.current===id){const unavailable=cause instanceof ApiError&&[403,404].includes(cause.status);if(unavailable){notificationTarget.current=undefined;setNotificationId(undefined);}setError(unavailable?"This conversation is no longer available.":cause instanceof Error?cause.message:"Could not open the notification. Please try again.");}}
  },[api]);
  useEffect(()=>{let active=true;let stop:(()=>void)|undefined;void observeMessageNotifications(id=>{if(!active)return false;setNotificationId(id);return true;}).then(cleanup=>{if(active)stop=cleanup;else cleanup();}).catch(()=>{});return()=>{active=false;stop?.();};},[]);
  // Let onboarding/session restoration finish before opening a cold-start notification.
  useEffect(()=>{if(notificationId&&ready&&pathname!=="/profile-setup"){const timeout=setTimeout(()=>void openNotification(notificationId),0);return()=>clearTimeout(timeout);}},[notificationId,ready,pathname,openNotification]);
  const refresh=useCallback(()=>pending.current ||= api.community().then(value=>{if(alive.current){for(const old of latestSnapshot.current.conversations)if(!value.conversations.some(c=>c.id===old.id))removeCache(userId,`conversation-${old.id}`);latestSnapshot.current=value;setSnapshot(value);setReady(true);if(!notificationTarget.current)setError("");setRevision(v=>v+1);void writeCache(userId,"community",value).catch(()=>{});}}).catch(cause=>{if(alive.current)setError(cause.message);}).finally(()=>{pending.current=undefined;}),[api,userId]);
  useEffect(()=>{alive.current=true;void refresh();return()=>{alive.current=false;};},[refresh]);
  useEffect(()=>{let active=true;void readCache<Snapshot>(userId,"community").then(value=>{if(active&&value&&latestSnapshot.current===empty){latestSnapshot.current=value;setSnapshot(value);}});return()=>{active=false;};},[userId]);
  useEffect(()=>{
    let stopped=false,connecting=false,socket:WebSocket|undefined,retry:ReturnType<typeof setTimeout>|undefined,backoff=2000;
    async function connect(){
      if(stopped||connecting||socket||AppState.currentState!=="active")return;
      connecting=true;
      try{const {ticket,url}=await api.socketTicket();if(stopped||AppState.currentState!=="active")return;
        if(!url){retry=setTimeout(()=>{void refresh();void connect();},15000);return;}
        const endpoint=new URL("/connect",url);endpoint.protocol=endpoint.protocol==="https:"?"wss:":"ws:";endpoint.searchParams.set("ticket",ticket);
        const connection=new WebSocket(endpoint.href);socket=connection;
        connection.onopen=()=>{if(socket===connection){backoff=2000;void refresh();}};
        connection.onmessage=event=>{if(socket!==connection||AppState.currentState!=="active")return;try{const packet=JSON.parse(String(event.data));if(packet.type==="typing"){setTyping(current=>applyTypingActivity(current,packet,userId));return;}if(packet.type==="changed")void refresh();}catch{/* Ignore malformed ephemeral events. */}};
        connection.onclose=()=>{if(socket!==connection)return;socket=undefined;setTyping([]);if(!stopped&&AppState.currentState==="active"){retry=setTimeout(()=>{void connect();},backoff+Math.random()*1000);backoff=Math.min(backoff*2,30000);}};
        connection.onerror=()=>connection.close();
      }catch{if(!stopped&&AppState.currentState==="active")retry=setTimeout(()=>{void refresh();void connect();},15000);}finally{connecting=false;}
    }
    void connect();const listener=AppState.addEventListener("change",state=>{if(retry)clearTimeout(retry);const previous=socket;socket=undefined;previous?.close();setTyping([]);if(state==="active"){void refresh();void connect();}});
    return()=>{stopped=true;if(retry)clearTimeout(retry);const previous=socket;socket=undefined;previous?.close();listener.remove();};
  },[api,refresh,userId]);
  const perform=useCallback(async<T,>(action:()=>Promise<T>)=>{try{const result=await action();await refresh();return result;}catch(cause){if(alive.current)setError(cause instanceof Error?cause.message:"Could not complete this action.");throw cause;}},[refresh]);
  const retry=()=>notificationTarget.current?openNotification(notificationTarget.current):refresh();
  return {api,userId,snapshot,ready,error,revision,refresh,retry,perform,typing,peopleActivity:pendingPeopleActivity(snapshot)};
}
const Context=createContext<ReturnType<typeof useMessengerState>|null>(null);
export function MessengerProvider({children}:PropsWithChildren){const state=useMessengerState();return <Context value={state}>{children}{!!state.error&&<View style={{backgroundColor:"#2A1720",paddingHorizontal:16,paddingVertical:12}}><Text accessibilityRole="alert" style={{fontSize:14,color:"#FFB4BC"}}>{state.error}</Text><Pressable accessibilityRole="button" onPress={()=>void state.retry()} style={{minHeight:48,justifyContent:"center"}}><Text style={{fontSize:16,color:"white"}}>Retry</Text></Pressable></View>}</Context>;}
export function useMessenger(){const value=useContext(Context);if(!value)throw Error("Missing messenger provider");return value;}
export function useAccessFailureRouting(){const {denyApproval}=useAuth();useEffect(()=>setAccessFailureHandler(code=>{clearPrivateCache();if(code==="NOT_APPROVED")denyApproval();router.replace(code==="SUSPENDED"?"/account-suspended":code==="NOT_APPROVED"?"/access-required":"/concurrent-session");}),[denyApproval]);}
