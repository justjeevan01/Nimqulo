import type { Auth, DecodedIdToken, UserRecord } from "firebase-admin/auth";
import { ServiceError } from "./messenger-types.ts";

export function approvedFirebaseUser(user:Pick<UserRecord,"disabled"|"emailVerified"|"email"|"customClaims"|"providerData">){
  return !user.disabled&&user.emailVerified&&user.customClaims?.approved===true&&!!user.email&&user.providerData.some(provider=>provider.providerId==="google.com"&&provider.email?.toLowerCase()===user.email!.toLowerCase());
}
export function firebaseSessionActive(user:UserRecord,sessionId:string){
  const started=Number(sessionId.split(".")[0]);
  return approvedFirebaseUser(user)&&Number.isSafeInteger(started)&&started>0&&started*1000>=Date.parse(user.tokensValidAfterTime||"1970-01-01");
}
export function createFirebaseAuthenticator(auth:Pick<Auth,"verifyIdToken"|"getUser">){
  return async(token:string,nonce?:string)=>{
    if(!nonce||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce))throw new ServiceError(401,"Please sign in again.","SESSION_EXPIRED");
    let payload:DecodedIdToken,user:UserRecord;
    try{payload=await auth.verifyIdToken(token);user=await auth.getUser(payload.uid);}
    catch(cause){
      const code=(cause as {code?:string}).code;
      if(code&&["auth/argument-error","auth/invalid-id-token","auth/id-token-expired","auth/id-token-revoked","auth/user-not-found","auth/user-disabled"].includes(code))throw new ServiceError(401,"Please sign in again.","SESSION_EXPIRED");
      throw new ServiceError(503,"Sign-in verification is temporarily unavailable. Please try again.");
    }
    if(!payload.email_verified||payload.firebase?.sign_in_provider!=="google.com"||!Number.isSafeInteger(payload.auth_time)||payload.auth_time<=0||user.disabled||!user.emailVerified||!user.providerData.some(p=>p.providerId==="google.com"&&p.uid===payload.firebase?.identities?.["google.com"]?.[0])||payload.auth_time*1000<Date.parse(user.tokensValidAfterTime||"1970-01-01"))throw new ServiceError(401,"Please sign in again with Google.","SESSION_EXPIRED");
    return {id:payload.uid,approved:approvedFirebaseUser(user),sessionId:`${payload.auth_time}.${nonce}`,sessionStarted:payload.auth_time*1000,...(user.photoURL?.startsWith("https://")?{avatarUrl:user.photoURL}:{})};
  };
}
