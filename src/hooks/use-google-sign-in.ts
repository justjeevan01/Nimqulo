import { GoogleAuthProvider,getAuth,signInWithCredential,getIdTokenResult } from "@react-native-firebase/auth";
import { GoogleOneTapSignIn,isCancelledResponse,isSuccessResponse } from "react-native-nitro-google-signin";
import { randomUUID } from "expo-crypto";
import { useRef,useState } from "react";
import { beginGoogleSession,useAuth } from "@/state/auth";
import Constants from "expo-constants";

export function useGoogleSignIn(){
  const {isLoaded,isSignedIn}=useAuth();const pending=useRef(false);
  const [isSigningIn,setSigningIn]=useState(false);const [error,setError]=useState<string|null>(null);
  async function signIn(){
    if(!isLoaded||isSignedIn||pending.current)return;
    pending.current=true;setSigningIn(true);setError(null);
    try{
      const clientId=Constants.expoConfig?.extra?.googleWebClientId;
      if(typeof clientId!=="string"||!clientId.endsWith(".apps.googleusercontent.com"))throw Error("Google sign-in configuration is missing.");
      GoogleOneTapSignIn.configure({webClientId:clientId});
      await GoogleOneTapSignIn.checkPlayServices();
      const response=await GoogleOneTapSignIn.presentExplicitSignIn();
      if(isCancelledResponse(response))return;
      if(!isSuccessResponse(response)||!response.data.idToken)throw Error("Google sign-in did not finish. Please try again.");
      await beginGoogleSession(randomUUID());
      const result=await signInWithCredential(getAuth(),GoogleAuthProvider.credential(response.data.idToken));
      await getIdTokenResult(result.user,true);
    }catch(cause){
      const code=(cause as {code?:string}).code;
      if(code!=="SIGN_IN_CANCELLED")setError(code==="auth/network-request-failed"?"Check your connection and try signing in again.":"Could not sign in with Google. Please try again.");
    }finally{pending.current=false;setSigningIn(false);}
  }
  return {signIn,isReady:isLoaded&&!isSignedIn,isSigningIn,error};
}
