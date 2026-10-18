const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const { Client } = require("pg");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
(async () => {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) throw new Error("EXPO_PUBLIC_API_URL is missing; deploy and pull the function URL first.");
  const health = await fetch(new URL("health", base));
  assert.equal(health.status, 200); assert.equal((await health.json()).service, "nimqulo-api");
  assert.equal((await fetch(new URL("preferences", base))).status, 401);
  assert.equal((await fetch(new URL("preferences", base), { headers: { Authorization: "Bearer invalid" } })).status, 401);
  console.log("PASS: deployed function health and unauthenticated rejection");
  let session;
  async function token() {
    if (process.env.BACKEND_TEST_TOKEN) return process.env.BACKEND_TEST_TOKEN;
    if (!process.env.BACKEND_TEST_USER_ID || !process.env.CLERK_SECRET_KEY) throw new Error("Set BACKEND_TEST_TOKEN or BACKEND_TEST_USER_ID locally for an approved account with an active app session.");
    const headers = { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" };
    if (!session) {
      const response = await fetch(`https://api.clerk.com/v1/sessions?user_id=${encodeURIComponent(process.env.BACKEND_TEST_USER_ID)}&status=active&limit=1`, { headers });
      if (!response.ok) throw new Error(`Clerk session lookup failed: HTTP ${response.status}`);
      const result = await response.json();
      session = (Array.isArray(result) ? result : result.data)?.[0]?.id;
      if (!session) throw new Error("Sign into the app first; the selected test account has no active session.");
    }
    const response = await fetch(`https://api.clerk.com/v1/sessions/${session}/tokens`, { method: "POST", headers, body: "{}" });
    if (!response.ok) throw new Error(`Clerk test token failed: HTTP ${response.status}`);
    const result = await response.json();
    if (!result.jwt) throw new Error("Clerk did not return a session token.");
    return result.jwt;
  }
  const { createBackend } = await import("../src/lib/backend.ts");
  const api = createBackend(token);
  const original = await api.preferences();
  const next = { ...original, appearance: original.appearance === "Dark" ? "System" : "Dark", notifications: !original.notifications };
  let uploaded;
  const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await api.savePreferences(next);
    assert.deepEqual(await api.preferences(), next);
    console.log("PASS: app client -> Neon Function -> Postgres preferences write/read");
    const bytes = fs.readFileSync("assets/chats/preview-teyler.png");
    uploaded = await api.uploadImage(`data:image/png;base64,${bytes.toString("base64")}`);
    const stored = await api.image(uploaded.id);
    const download = await fetch(stored.url); assert.equal(download.status, 200);
    assert.equal(hash(Buffer.from(await download.arrayBuffer())), hash(bytes));
    const result = await client.query("SELECT size, content_type, owner_id, object_key FROM nimqulo_media WHERE id=$1", [uploaded.id]);
    assert.equal(result.rows[0].size, bytes.length); assert.equal(result.rows[0].content_type, "image/png");
    console.log("PASS: app client -> Function -> private object storage; downloaded bytes match; Postgres metadata verified");
    if (process.env.BACKEND_OTHER_TOKEN) {
      const other = createBackend(async () => process.env.BACKEND_OTHER_TOKEN);
      await assert.rejects(other.image(uploaded.id), /not found/);
      await assert.rejects(other.deleteImage(uploaded.id), /not found/);
      console.log("PASS: second authenticated user cannot read or delete the first user's image");
    } else console.log("NOT TESTED: live cross-user check (BACKEND_OTHER_TOKEN not supplied)");
  } finally {
    try {
      const cleanup = await Promise.allSettled([api.savePreferences(original), ...(uploaded ? [api.deleteImage(uploaded.id)] : [])]);
      if (cleanup.some(result => result.status === "rejected")) throw new Error("Smoke-test cleanup failed; inspect the test preferences and upload before retrying.");
      if (uploaded) assert.equal((await client.query("SELECT 1 FROM nimqulo_media WHERE id=$1", [uploaded.id])).rowCount, 0);
    } finally { await client.end(); }
  }
  console.log("PASS: test preferences restored and test upload removed");
})().catch(error => { console.error(error.message); process.exitCode = 1; });
