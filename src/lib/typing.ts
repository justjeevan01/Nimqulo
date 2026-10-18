import type { TypingActivity } from "../../backend/messenger-types";
export type { TypingActivity };
// Coalesce input and serialize requests so a slow "start" cannot overtake "stop".
export function createTypingSender(publish:(typing:boolean)=>Promise<void>,now=Date.now){
 let enabled=false,wanted=false,busy=false,revision=0,processed=0,lastPulse=-Infinity;
 let idle:ReturnType<typeof setTimeout>|undefined;
 async function flush(){if(busy)return;busy=true;try{while(processed<revision){processed=revision;const value=wanted;try{await publish(value);}catch{/* Ephemeral presence must never block messaging. */}}}finally{busy=false;}}
 function stop(){if(idle)clearTimeout(idle);idle=undefined;if(wanted){wanted=false;revision++;void flush();}}
 return {
   setEnabled(value:boolean){enabled=value;if(!value)stop();},
   input(value:boolean){if(!enabled)return;if(!value){stop();return;}if(idle)clearTimeout(idle);idle=setTimeout(stop,2500);if(!wanted||now()-lastPulse>=3000){wanted=true;lastPulse=now();revision++;void flush();}},
   stop,
 };
}
export function applyTypingActivity(current:readonly TypingActivity[],packet:unknown,self:string,now=Date.now()):readonly TypingActivity[]{
 const live=current.filter(value=>value.expiresAt>now);
 if(!packet||typeof packet!=="object")return live;
 const a=packet as TypingActivity&{ttlMs:number};
 if(typeof a.conversationId!=="string"||!/^[0-9a-f-]{36}$/i.test(a.conversationId)||typeof a.userId!=="string"||a.userId===self||typeof a.name!=="string"||a.name.length>120||typeof a.typing!=="boolean"||!Number.isFinite(a.ttlMs)||a.ttlMs<=0||a.ttlMs>6000)return live;
 const remaining=live.filter(value=>value.conversationId!==a.conversationId||value.userId!==a.userId);
 return a.typing?[...remaining,{conversationId:a.conversationId,userId:a.userId,name:a.name,typing:true,expiresAt:now+a.ttlMs}]:remaining;
}
