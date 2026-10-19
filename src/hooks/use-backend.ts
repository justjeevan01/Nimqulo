import { useAuth } from "@/state/auth";
import { useEffect, useMemo, useRef } from "react";
import { createBackend } from "@/lib/backend";

export function useBackend() {
  const { getToken } = useAuth();
  const latestToken=useRef(getToken);
  useEffect(()=>{latestToken.current=getToken;},[getToken]);
  // createBackend stores this callback; requests invoke it after render.
  // eslint-disable-next-line react-hooks/refs
  return useMemo(() => createBackend(() => latestToken.current()), []);
}
