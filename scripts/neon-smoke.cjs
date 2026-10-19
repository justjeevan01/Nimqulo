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
  async function token() {
    if(!process.env.BACKEND_TEST_TOKEN||!process.env.BACKEND_TEST_SESSION_NONCE)throw new Error("Set BACKEND_TEST_TOKEN and BACKEND_TEST_SESSION_NONCE locally from your own active Firebase app session. Never paste credentials into chat.");
    return {token:process.env.BACKEND_TEST_TOKEN,sessionNonce:process.env.BACKEND_TEST_SESSION_NONCE};
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
    const bytes = fs.readFileSync("assets/images/app-icon.png");
    uploaded = await api.uploadImage(`data:image/png;base64,${bytes.toString("base64")}`);
    const stored = await api.image(uploaded.id);
    const download = await fetch(stored.url); assert.equal(download.status, 200);
    assert.equal(hash(Buffer.from(await download.arrayBuffer())), hash(bytes));
    const result = await client.query("SELECT size, content_type, owner_id, object_key FROM nimqulo_media WHERE id=$1", [uploaded.id]);
    assert.equal(result.rows[0].size, bytes.length); assert.equal(result.rows[0].content_type, "image/png");
    console.log("PASS: app client -> Function -> private object storage; downloaded bytes match; Postgres metadata verified");
    if (process.env.BACKEND_OTHER_TOKEN && process.env.BACKEND_OTHER_SESSION_NONCE) {
      const other = createBackend(async () => ({token:process.env.BACKEND_OTHER_TOKEN,sessionNonce:process.env.BACKEND_OTHER_SESSION_NONCE}));
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
