import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { useBackend } from "@/hooks/use-backend";
import type { Profile } from "@/lib/backend";
import { deviceId } from "@/lib/device";
import { setCacheOwner, readCache, writeCache } from "@/lib/local-cache";
import { ApiError } from "@/lib/backend";
import { useAuth, useUser } from "@/state/auth";
import { AppState } from "react-native";

function useProfileState() {
  const api = useBackend();
  const {user}=useUser();const userId=user!.id;
  const {sessionId}=useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photo,setPhoto]=useState<string>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const saving = useRef(false);
  const photoRevision=useRef(0);
  useEffect(() => {
    let active = true;
    setCacheOwner(userId);
    void Promise.all([readCache<Profile>(userId,"profile"),readCache<string>(userId,"confirmed-session")]).then(([cached,confirmed])=>{if(active&&cached&&confirmed===sessionId){setProfile(cached);setReady(true);}});
    void deviceId().then(id=>api.activate(id)).then(()=>api.profile()).then(value => { if (active) { setProfile(value); setReady(true); setError("");void writeCache(userId,"profile",value).catch(()=>{}); } })
      .catch(async cause => { if (active) {if(cause instanceof ApiError&&cause.code==="OFFLINE"){const cached=await readCache<Profile>(userId,"profile");if(active&&cached){setProfile(cached);setReady(true);return;}}setError(cause.message || "Could not load your profile.");} });
    return () => { active = false; };
  }, [api, attempt,userId,sessionId]);
  const save = useCallback(async (value: Profile) => {
    if (saving.current) throw new Error("Your profile is already being saved.");
    saving.current = true;
    try { const saved = await api.saveProfile(value);const avatarUrl=photo||profile?.avatarUrl;const next={...saved,...(avatarUrl?{avatarUrl}:{})}; setProfile(next);await writeCache(userId,"profile",next); return next; }
    finally { saving.current = false; }
  }, [api,userId,profile?.avatarUrl,photo]);
  useEffect(()=>{
    let active=true;
    const refresh=()=>{const revision=photoRevision.current;void api.profile().then(value=>{if(active&&value&&revision===photoRevision.current){setProfile(value);setPhoto(value.avatarUrl);}}).catch(()=>{});};
    const listener=AppState.addEventListener("change",state=>{if(state==="active")refresh();});
    const timer=setInterval(()=>{if(AppState.currentState==="active")refresh();},12*60*1000);
    return()=>{active=false;listener.remove();clearInterval(timer);};
  },[api]);
  const uploadPhoto=useCallback(async(uri:string)=>{photoRevision.current++;const image=await api.uploadImage(uri);const saved=await api.saveAvatar(image.id);setPhoto(saved.url);setProfile(current=>current?{...current,avatarUrl:saved.url}:current);return saved.url;},[api]);
  return { profile,avatarUrl:photo||profile?.avatarUrl, ready, error, save, uploadPhoto, retry: () => { setError(""); setAttempt(value => value + 1); } };
}
const Context = createContext<ReturnType<typeof useProfileState> | null>(null);
export function ProfileProvider({ children }: PropsWithChildren) {
  const value = useProfileState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useProfile() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing profile provider");
  return value;
}
