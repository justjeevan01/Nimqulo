const test = require("node:test");
const assert = require("node:assert/strict");

test("Clerk verification checks signature, issuer, expiry, origin, and server approval", async () => {
  const { generateKeyPair, exportJWK, SignJWT } = await import("jose");
  const { createAuthenticator } = await import("../backend/auth.ts");
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...await exportJWK(publicKey), kid: "test", alg: "RS256", use: "sig" };
  const originalFetch = global.fetch;
  let approved = true, userLookups = 0, active = true, google = true;
  global.fetch = async (url, options) => {
    if (String(url) === "https://clerk.example/.well-known/jwks.json") return Response.json({ keys: [jwk] });
    assert.equal(options.headers.Authorization, "Bearer server-only-key");
    if (String(url) === "https://api.clerk.com/v1/sessions/sess_test") return Response.json({ user_id: "user_alice", status: active ? "active" : "revoked", created_at: 100 });
    assert.equal(String(url), "https://api.clerk.com/v1/users/user_alice");
    userLookups++;
    return Response.json({ public_metadata: { approved }, primary_email_address_id: "email", email_addresses: [{id:"email",email_address:"qa@example.com",verification:{status:"verified"}}], external_accounts: google ? [{provider:"oauth_google",email_address:"qa@example.com"}] : [] });
  };
  const sign = (claims = {}) => new SignJWT({ sub: "user_alice", sid: "sess_test", azp: "http://localhost:8081", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "test" }).setIssuer("https://clerk.example").setIssuedAt().setExpirationTime("1m").sign(privateKey);
  try {
    const authenticate = createAuthenticator("https://clerk.example", "server-only-key", ["http://localhost:8081"]);
    assert.deepEqual(await authenticate(await sign()), { id: "user_alice", approved: true, sessionId: "sess_test", sessionStarted: 100 });
    for (const value of [false, "true", undefined]) {
      approved = value;
      assert.equal((await authenticate(await sign())).approved, false);
    }
    approved = true; google = false;
    assert.equal((await authenticate(await sign())).approved, false);
    google = true; active = false;
    await assert.rejects(authenticate(await sign()));
    const before = userLookups;
    await assert.rejects(authenticate(await sign({ azp: "https://attacker.example" })));
    await assert.rejects(authenticate("forged"));
    await assert.rejects(authenticate(await new SignJWT({ sub: "user_alice", sid: "sess_test" }).setProtectedHeader({ alg: "RS256", kid: "test" }).setIssuer("https://wrong.example").setExpirationTime("1m").sign(privateKey)));
    await assert.rejects(authenticate(await new SignJWT({ sub: "user_alice", sid: "sess_test" }).setProtectedHeader({ alg: "RS256", kid: "test" }).setIssuer("https://clerk.example").setExpirationTime(1).sign(privateKey)));
    assert.equal(userLookups, before);
  } finally { global.fetch = originalFetch; }
});
