import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { useBackend } from "@/hooks/use-backend";
import type { Profile } from "@/lib/backend";

function useProfileState() {
  const api = useBackend();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    void api.profile().then(value => { if (active) { setProfile(value); setReady(true); setError(""); } })
      .catch(cause => { if (active) setError(cause.message || "Could not load your profile."); });
    return () => { active = false; };
  }, [api, attempt]);
  const save = useCallback(async (value: Profile) => {
    if (saving.current) throw new Error("Your profile is already being saved.");
    saving.current = true;
    try { const saved = await api.saveProfile(value); setProfile(saved); return saved; }
    finally { saving.current = false; }
  }, [api]);
  return { profile, ready, error, save, retry: () => { setError(""); setAttempt(value => value + 1); } };
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
