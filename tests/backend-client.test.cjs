const test = require("node:test");
const assert = require("node:assert/strict");

test("app client refreshes credentials and shows actionable connection errors", async () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = "https://api.test/";
  try {
    const { createBackend } = await import("../src/lib/backend.ts");
    let calls = 0;
    const api = createBackend(async () => `token-${++calls}`);
    global.fetch = async (url, init) => {
      assert.equal(url, "https://api.test/profile");
      assert.equal(init.headers.Authorization, `Bearer token-${calls}`);
      return Response.json({ displayName: "Alice", username: "alice_1" });
    };
    await api.profile(); await api.profile(); assert.equal(calls, 2);
    global.fetch = async () => { throw new Error("java.net.UnknownHostException: private.host"); };
    await assert.rejects(api.saveProfile({ displayName: "Alice", username: "alice_1" }), { message: "Could not connect. Check your connection and try again." });
    global.fetch = async () => Response.json({ error: "That username is already taken. Choose another." }, { status: 409 });
    await assert.rejects(api.saveProfile({ displayName: "Alice", username: "alice_1" }), /already taken/);
    await assert.rejects(createBackend(async () => { throw new Error("internal session details"); }).profile(), /Check your connection/);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});
