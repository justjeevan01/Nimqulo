import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { useMessenger } from "./messenger";
import { registerMessagePush } from "@/lib/notifications";
function useCommunityState(){
 const {api,snapshot,perform,userId}=useMessenger();
 const [appearance,setAppearanceValue]=useState("System");const [notifications,setNotificationsValue]=useState(true);
 const [previews,setPreviewsValue]=useState(false);
 const [preferenceError,setPreferenceError]=useState("");const [preferencesReady,setPreferencesReady]=useState(false);const [preferencesBusy,setPreferencesBusy]=useState(false);
 const [retry,setRetry]=useState(0);const saving=useRef(false);const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;let active=true;void api.preferences().then(value=>{if(active){setAppearanceValue(value.appearance);setNotificationsValue(value.notifications);setPreviewsValue(value.previews??false);setPreferencesReady(true);}}).catch(error=>{if(active)setPreferenceError(error.message);});return ()=>{active=false;mounted.current=false;};},[api,retry]);
 useEffect(()=>{if(preferencesReady)void (notifications?registerMessagePush(api.saveDevice):api.saveDevice(null)).catch(()=>{if(mounted.current)setPreferenceError("Push notifications are unavailable. Messaging in the app still works.");});},[api,notifications,preferencesReady,retry]);
 function savePreferences(nextAppearance:string,nextNotifications:boolean,nextPreviews=previews){if(saving.current||!preferencesReady)return;saving.current=true;setPreferencesBusy(true);setPreferenceError("");void api.savePreferences({appearance:nextAppearance,notifications:nextNotifications,previews:nextPreviews}).then(value=>{if(mounted.current){setAppearanceValue(value.appearance);setNotificationsValue(value.notifications);setPreviewsValue(value.previews??false);}}).catch(error=>{if(mounted.current)setPreferenceError(error.message);}).finally(()=>{saving.current=false;if(mounted.current)setPreferencesBusy(false);});}
 const run=(action:()=>Promise<unknown>)=>{void perform(action).catch(()=>{});};
 return {groups:snapshot.groups,invitations:snapshot.invitations,blocked:snapshot.blocked,appearance,notifications,previews,setPreviews:(value:boolean)=>savePreferences(appearance,notifications,value),preferenceError,preferencesReady,preferencesBusy,
 retryPreferences:()=>{setPreferencesReady(false);setPreferenceError("");setRetry(value=>value+1);},
 async saveGroup(name:string,ids:readonly string[],_avatar:unknown,id?:string){return perform(()=>api.saveGroup(name,ids,id));},
 decideInvitation:(id:string,status:"accepted"|"declined")=>run(()=>api.decideInvitation(id,status)),
 setRole:(groupId:string,personId:string,role:"Admin"|"Member")=>run(()=>api.manageMember(groupId,personId,role)),
 transferOwner:(groupId:string,personId:string)=>run(()=>api.manageMember(groupId,personId,"transfer")),
 removeMember:(groupId:string,personId:string)=>run(()=>api.manageMember(groupId,personId,"remove")),
 setAppearance:(value:string)=>savePreferences(value,notifications),setNotifications:(value:boolean)=>savePreferences(appearance,value),
 unblock:(id:string)=>run(()=>api.block(id,false)),
 leaveGroup:(id:string)=>perform(()=>api.manageMember(id,userId,"leave")),
 };
}
const Context=createContext<ReturnType<typeof useCommunityState>|null>(null);
export function CommunityProvider({children}:PropsWithChildren){const value=useCommunityState();return <Context value={value}>{children}</Context>;}
export function useCommunity(){const value=useContext(Context);if(!value)throw Error("Missing community provider");return value;}
