export type Preferences = { appearance: string; notifications: boolean };
export type Profile = { displayName: string; username: string };
export type TokenProvider = () => Promise<string | null>;
export function createBackend(getToken: TokenProvider) {
  const base = process.env.EXPO_PUBLIC_API_URL;
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!base) throw new Error("The service is not available yet. Please try again later.");
    let token;
    try { token = await getToken(); }
    catch { throw new Error("Could not verify your session. Check your connection and try again."); }
    if (!token) throw new Error("Please sign in again.");
    let response;
    try { response = await fetch(`${base.replace(/\/$/, "")}${path}`, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) }); }
    catch { throw new Error("Could not connect. Check your connection and try again."); }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Could not reach the backend. Please try again.");
    }
    return response.status === 204 ? undefined as T : response.json();
  }
  return {
    configured: !!base,
    profile: () => request<Profile | null>("/profile"),
    saveProfile: (value: Profile) => request<Profile>("/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) }),
    preferences: () => request<Preferences>("/preferences"),
    savePreferences: (value: Preferences) => request<Preferences>("/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) }),
    async uploadImage(uri: string) {
      const response = await fetch(uri);
      const blob = await response.blob();
      if (blob.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
      return request<{ id: string; url: string }>("/media", { method: "POST", headers: { "Content-Type": blob.type || "application/octet-stream" }, body: blob });
    },
    image: (id: string) => request<{ id: string; url: string }>(`/media/${encodeURIComponent(id)}`),
    deleteImage: (id: string) => request<void>(`/media/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}
