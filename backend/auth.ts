import { createRemoteJWKSet, jwtVerify } from "jose";
import { ServiceError } from "./messenger-types.ts";
import { approvedGoogleUser, type ClerkUser } from "./clerk-policy.ts";

export function createAuthenticator(issuer: string, secretKey: string, origins: string[]) {
  const keys = createRemoteJWKSet(new URL("/.well-known/jwks.json", issuer));
  return async (token: string) => {
    const { payload } = await jwtVerify(token, keys, { issuer, algorithms: ["RS256"], requiredClaims: ["exp", "sub", "sid"] });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") throw new Error("Invalid session");
    if (payload.azp && (typeof payload.azp !== "string" || !origins.includes(payload.azp))) throw new Error("Invalid origin");
    const headers = { Authorization: `Bearer ${secretKey}` };
    const [response, sessionResponse] = await Promise.all([
      fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(payload.sub)}`, { headers, signal: AbortSignal.timeout(10000) }),
      fetch(`https://api.clerk.com/v1/sessions/${encodeURIComponent(payload.sid)}`, { headers, signal: AbortSignal.timeout(10000) }),
    ]).catch(()=>{throw new ServiceError(503,"Could not verify your account right now. Please try again.");});
    if([response.status,sessionResponse.status].includes(429))throw new ServiceError(429,"Sign-in verification is busy. Please try again shortly.");
    if (!response.ok || !sessionResponse.ok) {
      if([response.status,sessionResponse.status].some(status=>status>=500))throw new ServiceError(503,"Sign-in verification is temporarily unavailable.");
      throw new ServiceError(401,"Please sign in again.","SESSION_EXPIRED");
    }
    const user = await response.json() as ClerkUser;
    const session = await sessionResponse.json() as { user_id: string; status: string; created_at: number };
    if (session.user_id !== payload.sub || session.status !== "active" || !Number.isSafeInteger(session.created_at)) throw new ServiceError(401,"Your session has ended. Please sign in again.","SESSION_EXPIRED");
    return { id: payload.sub, approved: approvedGoogleUser(user), sessionId: payload.sid, sessionStarted: session.created_at, ...(user.image_url?.startsWith("https://")?{avatarUrl:user.image_url}:{}) };
  };
}
