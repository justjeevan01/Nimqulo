import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { useMessenger } from "./messenger";
import type { Person } from "@/components/social/types";
// Kept at the existing import path while routes transition to persisted data.
function useSocialState(){
  const {api,snapshot,perform}=useMessenger();const [discovered,setDiscovered]=useState<readonly Person[]>([]);
  const searchGeneration=useRef(0);
  const people=useMemo(()=>[...snapshot.people,...discovered.filter(p=>!snapshot.people.some(existing=>existing.id===p.id))],[snapshot.people,discovered]);
  const lookup=useCallback(async(username:string)=>{const current=++searchGeneration.current;const found=await api.lookup(username);if(current===searchGeneration.current)setDiscovered(found);return found;},[api]);
  const run=(action:()=>Promise<unknown>)=>{void perform(action).catch(()=>{});};
  return {people,requests:snapshot.requests,requested:people.filter(p=>p.requested).map(p=>p.username),
    lookup,
    report:async(personId:string,reason:string)=>{await perform(()=>api.report(personId,reason));return true;},
    connect:(person:Person)=>{if(!person.connected&&!person.blocked&&!person.requested)run(()=>api.connect(person.id));},
    accept:(id:string)=>run(()=>api.decideConnection(id,"accept")),
    dismiss:(id:string)=>run(()=>api.decideConnection(id,snapshot.requests.find(r=>r.id===id)?.direction==="incoming"?"decline":"cancel")),
    remove:(id:string)=>run(()=>api.removeConnection(id)),
    block:(id:string)=>run(()=>api.block(id,!people.find(p=>p.id===id)?.blocked)),
  };
}
const Context=createContext<ReturnType<typeof useSocialState>|null>(null);
export function SocialProvider({children}:PropsWithChildren){const value=useSocialState();return <Context value={value}>{children}</Context>;}
export function useSocial(){const value=useContext(Context);if(!value)throw Error("Missing social provider");return value;}
export const profilePerson=(person:Person)=>person;
