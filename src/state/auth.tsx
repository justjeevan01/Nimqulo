import { createContext,useCallback,useContext,useEffect,useMemo,useState,type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { getAuth,getIdToken,getIdTokenResult,onIdTokenChanged,signOut as firebaseSignOut } from "@react-native-firebase/auth";
import * as SecureStore from "expo-secure-store";
import { GoogleOneTapSignIn } from "react-native-nitro-google-signin";

const nonceKey="nimqulo-firebase-session";
const approvalKey="nimqulo-firebase-approval";
export async function beginGoogleSession(nonce:string){await SecureStore.setItemAsync(nonceKey,nonce);}
export async function firebaseCredentials(){
  const user=getAuth().currentUser;if(!user)return null;
  const nonce=await SecureStore.getItemAsync(nonceKey);if(!nonce)return null;
  const token=await getIdToken(user);
  return getAuth().currentUser?.uid===user.uid?{token,sessionNonce:nonce}:null;
}
type AppUser={id:string;approved:boolean;imageUrl?:string;hasImage:boolean;reload:()=>Promise<void>};
type State={isLoaded:boolean;isSignedIn:boolean;user:AppUser|null;sessionId?:string;getToken:typeof firebaseCredentials;signOut:()=>Promise<void>;denyApproval:()=>void};
const Context=createContext<State|null>(null);
export function AuthProvider({children}:PropsWithChildren){
  const [state,setState]=useState<{loaded:boolean;user:ReturnType<typeof getAuth>["currentUser"];approved:boolean;sessionId?:string}>({loaded:false,user:null,approved:false});
  const reload=useCallback(async()=>{const user=getAuth().currentUser;if(user)await getIdTokenResult(user,true);},[]);
  useEffect(()=>{
    let version=0,stopped=false;
    const stop=onIdTokenChanged(getAuth(),user=>{
      const current=++version;
      if(!user){setState({loaded:true,user:null,approved:false});return;}
      void(async()=>{
        const nonce=await SecureStore.getItemAsync(nonceKey);
        if(!nonce){await firebaseSignOut(getAuth());return;}
        let approved=false,started:number|undefined;
        try{const token=await getIdTokenResult(user);approved=token.claims.approved===true;started=Number(token.claims.auth_time);await SecureStore.setItemAsync(approvalKey,JSON.stringify({id:user.uid,approved,started}));}
        catch{const cache=JSON.parse(await SecureStore.getItemAsync(approvalKey)||"null");if(cache?.id===user.uid){approved=cache.approved===true;started=cache.started;}}
        if(!stopped&&current===version)setState({loaded:true,user,approved,sessionId:started?`${started}.${nonce}`:undefined});
      })().catch(()=>{if(!stopped&&current===version)setState({loaded:true,user,approved:false});});
    });
    const listener=AppState.addEventListener("change",value=>{if(value==="active")void reload().catch(()=>{});});
    return()=>{stopped=true;version++;stop();listener.remove();};
  },[reload]);
  useEffect(()=>{if(!state.user||state.approved)return;const timer=setInterval(()=>void reload().catch(()=>{}),15000);return()=>clearInterval(timer);},[state.user,state.approved,reload]);
  const signOut=useCallback(async()=>{
    await firebaseSignOut(getAuth());
    await SecureStore.deleteItemAsync(nonceKey);await SecureStore.deleteItemAsync(approvalKey);
    await GoogleOneTapSignIn.signOut().catch(()=>{});
  },[]);
  const denyApproval=useCallback(()=>{setState(current=>({...current,approved:false}));},[]);
  const user=useMemo(()=>state.user?{id:state.user.uid,approved:state.approved,imageUrl:state.user.photoURL||undefined,hasImage:!!state.user.photoURL,reload}:null,[state.user,state.approved,reload]);
  const value=useMemo(()=>({isLoaded:state.loaded,isSignedIn:!!user,user,sessionId:state.sessionId,getToken:firebaseCredentials,signOut,denyApproval}),[state.loaded,state.sessionId,user,signOut,denyApproval]);
  return <Context value={value}>{children}</Context>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw Error("Missing authentication provider");return value;}
export function useUser(){const {user,isLoaded}=useAuth();return {user,isLoaded};}
