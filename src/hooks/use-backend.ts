import { useAuth } from "@clerk/expo";
import { useMemo } from "react";
import { createBackend } from "@/lib/backend";

export function useBackend() {
  const { getToken } = useAuth();
  return useMemo(() => createBackend(() => getToken()), [getToken]);
}
