const test = require("node:test");
const assert = require("node:assert/strict");

test("Clerk verification checks signature, issuer, expiry, origin, and server approval", async () => {
  const { generateKeyPair, exportJWK, SignJWT } = await import("jose");
  const { createAuthenticator } = await import("../backend/auth.ts");
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...await exportJWK(publicKey), kid: "test", alg: "RS256", use: "sig" };
  const originalFetch = global.fetch;
  let approved = true, userLookups = 0;
  global.fetch = async (url, options) => {
    if (String(url) === "https://clerk.example/.well-known/jwks.json") return Response.json({ keys: [jwk] });
    assert.equal(String(url), "https://api.clerk.com/v1/users/user_alice");
    assert.equal(options.headers.Authorization, "Bearer server-only-key");
    userLookups++;
    return Response.json({ public_metadata: { approved } });
  };
  const sign = (claims = {}) => new SignJWT({ sub: "user_alice", sid: "sess_test", azp: "http://localhost:8081", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "test" }).setIssuer("https://clerk.example").setIssuedAt().setExpirationTime("1m").sign(privateKey);
  try {
    const authenticate = createAuthenticator("https://clerk.example", "server-only-key", ["http://localhost:8081"]);
    assert.deepEqual(await authenticate(await sign()), { id: "user_alice", approved: true });
    approved = false;
    assert.deepEqual(await authenticate(await sign()), { id: "user_alice", approved: false });
    const before = userLookups;
    await assert.rejects(authenticate(await sign({ azp: "https://attacker.example" })));
    await assert.rejects(authenticate("forged"));
    await assert.rejects(authenticate(await new SignJWT({ sub: "user_alice", sid: "sess_test" }).setProtectedHeader({ alg: "RS256", kid: "test" }).setIssuer("https://wrong.example").setExpirationTime("1m").sign(privateKey)));
    await assert.rejects(authenticate(await new SignJWT({ sub: "user_alice", sid: "sess_test" }).setProtectedHeader({ alg: "RS256", kid: "test" }).setIssuer("https://clerk.example").setExpirationTime(1).sign(privateKey)));
    assert.equal(userLookups, before);
  } finally { global.fetch = originalFetch; }
});
