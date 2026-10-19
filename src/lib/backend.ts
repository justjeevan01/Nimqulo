import type { Snapshot, PersonRecord, MessageRecord } from "../../backend/messenger-types";
export type Preferences = { appearance: string; notifications: boolean; previews?:boolean };
export type Profile = { displayName: string; username: string;avatarUrl?:string };
export type TokenProvider = () => Promise<string | {token:string;sessionNonce:string} | null>;
export type { Snapshot, PersonRecord, MessageRecord, ConversationRecord, GroupRecord } from "../../backend/messenger-types";
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message:string,status:number,code?:string){super(message);this.status=status;this.code=code;}
}
let onAccessFailure: ((code:string)=>void)|undefined;
export function setAccessFailureHandler(handler:typeof onAccessFailure){onAccessFailure=handler;return ()=>{if(onAccessFailure===handler)onAccessFailure=undefined;};}
export function createBackend(getToken: TokenProvider) {
  const base = process.env.EXPO_PUBLIC_API_URL;
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!base) throw new Error("The service is not available yet. Please try again later.");
    let token;let timeout:ReturnType<typeof setTimeout>|undefined;
    try { token = await Promise.race([getToken(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error("Token refresh timed out")),8000);})]); }
    catch { throw new ApiError("Could not verify your session. Check your connection and try again.",0,"OFFLINE"); }
    finally{if(timeout)clearTimeout(timeout);}
    if (!token) throw new Error("Please sign in again.");
    const session=typeof token==="string"?{token}:token;
    let response;
    try { response = await fetch(`${base.replace(/\/$/, "")}${path}`, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${session.token}`, ...("sessionNonce" in session?{"X-App-Session":session.sessionNonce}:{}) }, signal: AbortSignal.timeout(30000) }); }
    catch { throw new ApiError("Could not connect. Check your connection and try again.",0,"OFFLINE"); }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if(["SESSION_REPLACED","SESSION_EXPIRED","SUSPENDED","ACCOUNT_DELETED","NOT_APPROVED"].includes(body.code))onAccessFailure?.(body.code);
      throw new ApiError(body.error || "Could not reach the backend. Please try again.",response.status,body.code);
    }
    return response.status === 204 ? undefined as T : response.json();
  }
  const json = (method:string,value:unknown):RequestInit=>({method,headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
  const pathId = encodeURIComponent;
  return {
    configured: !!base,
    activate: (deviceId:string)=>request<{ok:true}>("/session/activate",json("POST",{deviceId})),
    session: ()=>request<{id:string;sessionId:string}>("/session"),
    endSession:()=>request<void>("/session",{method:"DELETE"}),
    saveAvatar:(mediaId:string)=>request<{url:string}>("/profile/photo",json("PUT",{mediaId})),
    accounts:(cursor?:string)=>request<{accounts:{id:string;email:string;name:string;approved:boolean;operator:boolean;status:string}[];next?:string}>(`/moderation/accounts${cursor?`?cursor=${pathId(cursor)}`:""}`),
    approveAccount:(id:string,approved:boolean)=>request<void>(`/moderation/accounts/${pathId(id)}`,json("PUT",{approved})),
    community: ()=>request<Snapshot>("/community"),
    lookup: (username:string)=>request<PersonRecord[]>(`/people?username=${pathId(username)}`),
    connect: (targetId:string)=>request<void>("/connections",json("POST",{targetId})),
    decideConnection: (id:string,decision:"accept"|"decline"|"cancel")=>request<void>(`/connections/${pathId(id)}/decision`,json("POST",{decision})),
    removeConnection: (targetId:string)=>request<void>(`/connections/${pathId(targetId)}`,{method:"DELETE"}),
    direct: (targetId:string)=>request<{id:string}>("/conversations/direct",json("POST",{targetId})),
    saveGroup: (name:string,invitees:readonly string[],id?:string,mediaId?:string)=>request<{id:string}>(id?`/groups/${pathId(id)}`:"/groups",json(id?"PUT":"POST",{name,invitees,mediaId})),
    manageMember: (id:string,targetId:string,action:"Admin"|"Member"|"remove"|"transfer"|"leave")=>request<void>(`/groups/${pathId(id)}/members`,json("POST",{targetId,action})),
    decideInvitation: (id:string,status:"accepted"|"declined")=>request<void>(`/invitations/${pathId(id)}/decision`,json("POST",{status})),
    messages: (id:string,before?:number)=>request<{messages:MessageRecord[];before:number|null}>(`/conversations/${pathId(id)}/messages${before?`?before=${before}`:""}`),
    sendMessage: (id:string,text:string,retryId:string,replyToId?:string,imageId?:string)=>request<MessageRecord>(`/conversations/${pathId(id)}/messages`,json("POST",{text,retryId,replyToId,imageId})),
    async uploadChatImage(id:string,uri:string,retryId:string) {
      const blob=await (await fetch(uri)).blob();
      if(blob.size>5*1024*1024)throw new Error("Choose an image smaller than 5 MB.");
      return request<{id:string}>(`/conversations/${pathId(id)}/images/${pathId(retryId)}`,{method:"POST",headers:{"Content-Type":blob.type||"application/octet-stream"},body:blob});
    },
    chatImage:(id:string,imageId:string)=>request<{url:string}>(`/conversations/${pathId(id)}/images/${pathId(imageId)}`),
    read: (id:string,seq:number)=>request<void>(`/conversations/${pathId(id)}/read`,json("PUT",{seq})),
    typing: (id:string,typing:boolean)=>request<void>(`/conversations/${pathId(id)}/typing`,json("POST",{typing})),
    block: (targetId:string,blocked:boolean)=>request<void>(`/blocks/${pathId(targetId)}`,json("PUT",{blocked})),
    report: (targetId:string,reason:string)=>request<{id:string}>("/reports",json("POST",{targetId,reason})),
    saveDevice: (pushToken:string|null)=>request<void>("/device",json("PUT",{pushToken})),
    socketTicket: ()=>request<{ticket:string;url:string|null}>("/realtime/ticket",json("POST",{})),
    conversationAccess: (id:string)=>request<{kind:"direct"|"group"}>(`/conversations/${pathId(id)}/access`),
    reports: ()=>request<{id:string;target_name:string;reason:string;status:string}[]>("/moderation/reports"),
    moderate: (id:string,status:"reviewed"|"dismissed",suspend:boolean)=>request<void>(`/moderation/reports/${pathId(id)}`,json("PUT",{status,suspend})),
    deleteAccount: ()=>request<{status:"deleting"}>("/account",json("DELETE",{confirm:"DELETE"})),
    profile: () => request<Profile | null>("/profile"),
    saveProfile: (value: Profile) => request<Profile>("/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) }),
    preferences: () => request<Preferences>("/preferences"),
    savePreferences: (value: Preferences) => request<Preferences>("/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) }),
    async uploadImage(uri: string) {
      const response = await fetch(uri);
      const blob = await response.blob();
      if (blob.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
      return request<{ id: string; url: string }>("/media", { method: "POST", headers: { "Content-Type": blob.type || "application/octet-stream" }, body: blob });
    },
    image: (id: string) => request<{ id: string; url: string }>(`/media/${encodeURIComponent(id)}`),
    deleteImage: (id: string) => request<void>(`/media/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}
