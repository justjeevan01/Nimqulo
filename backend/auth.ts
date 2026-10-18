import { createRemoteJWKSet, jwtVerify } from "jose";

export function createAuthenticator(issuer: string, secretKey: string, origins: string[]) {
  const keys = createRemoteJWKSet(new URL("/.well-known/jwks.json", issuer));
  return async (token: string) => {
    const { payload } = await jwtVerify(token, keys, { issuer, algorithms: ["RS256"], requiredClaims: ["exp", "sub", "sid"] });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") throw new Error("Invalid session");
    if (payload.azp && (typeof payload.azp !== "string" || !origins.includes(payload.azp))) throw new Error("Invalid origin");
    const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(payload.sub)}`, {
      headers: { Authorization: `Bearer ${secretKey}` }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Could not verify account");
    const user = await response.json() as { public_metadata?: { approved?: unknown } };
    return { id: payload.sub, approved: user.public_metadata?.approved === true };
  };
}
