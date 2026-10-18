import { ServiceError, type TypingPublisher } from "./messenger-types.ts";
export function createTypingPublisher(url?:string,key?:string):TypingPublisher{
 return async(recipients,activity)=>{
   if(!url||!key)throw new ServiceError(503,"Typing indicators are temporarily unavailable.");
   await Promise.all(recipients.map(async userId=>{
     const response=await fetch(new URL("/dispatch",url),{method:"POST",headers:{"Content-Type":"application/json","X-Service-Key":key},body:JSON.stringify({kind:"typing",userId,activity}),signal:AbortSignal.timeout(3000),redirect:"error"});
     if(!response.ok)throw new ServiceError(503,"Typing indicators are temporarily unavailable.");
   }));
 };
}
