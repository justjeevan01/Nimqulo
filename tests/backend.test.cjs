const test = require("node:test");
const assert = require("node:assert/strict");
const source = import("../backend/app.ts");

async function harness(withMessenger = false) {
  const { createApp } = await source;
  const preferences = new Map(), media = new Map(), profiles = new Map();
  let touched = 0;
  const app = createApp({
    ...(withMessenger ? { messenger: { authorize: async () => {}, session: { run: (_identity, action) => action() } } } : {}),
    async authenticate(token) { if (!["alice", "bob", "pending"].includes(token)) throw new Error("bad token"); return { id: token, approved: token !== "pending" }; },
    async getProfile(id) { return profiles.get(id) || null; },
    async saveProfile(id, value) {
      const { ProfileConflict } = await import("../backend/profile.ts");
      if (profiles.has(id) && profiles.get(id).username !== value.username) throw new ProfileConflict("Your username cannot be changed during the pilot.");
      if ([...profiles.entries()].some(([owner, existing]) => owner !== id && existing.username === value.username)) throw new ProfileConflict("That username is already taken. Choose another.");
      profiles.set(id, value); return value;
    },
    async getPreferences(id) { touched++; return preferences.get(id) || { appearance: "System", notifications: true }; },
    async savePreferences(id, value) { touched++; preferences.set(id, value); return value; },
    async putMedia(value) { touched++; media.set(value.id, value); },
    async getMedia(id, owner) { touched++; const value = media.get(id); return value?.ownerId === owner ? value : undefined; },
    async mediaUrl(key) { return `https://storage.test/${key}`; },
    async deleteMedia(value) { touched++; media.delete(value.id); },
  }, ["http://localhost:8081"]);
  const request = (path, token, init = {}) => app.request(path, { ...init, headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return { request, preferences, media, touched: () => touched };
}

test("anonymous, forged, and unapproved sessions cannot access services", async () => {
  const h = await harness();
  for (const token of [undefined, "forged", "pending"]) {
    const response = await h.request("/preferences", token);
    assert.equal(response.status, token === "pending" ? 403 : 401);
  }
  assert.equal(h.touched(), 0);
  for (const token of [undefined, "forged", "pending"]) {
    assert.equal((await h.request("/profile", token)).status, token === "pending" ? 403 : 401);
    assert.equal((await h.request("/profile", token, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: "Pending", username: "pending_user", approved: true }) })).status, token === "pending" ? 403 : 401);
  }
});

test("messenger body limits cover exact and parameterized paths without limiting image uploads", async () => {
  const h = await harness(true);
  for (const path of ["/connections", "/groups", "/groups/123/members", "/conversations/123/messages", "/conversations/123/typing"]) {
    assert.equal((await h.request(path, "alice", { method: "POST", body: "x".repeat(25 * 1024) })).status, 413, path);
  }
  assert.equal((await h.request("/profile", "alice", { method: "PUT", body: "x".repeat(2049) })).status, 413);
  const image = Buffer.alloc(5 * 1024 * 1024);
  image.set([137,80,78,71,13,10,26,10]);
  const uploaded = await h.request("/media", "alice", { method: "POST", body: image });
  assert.equal(uploaded.status, 201);
  assert.equal(h.media.get((await uploaded.json()).id).size, image.length);
  assert.equal((await h.request("/media", "alice", { method: "POST", body: Buffer.alloc(image.length + 1) })).status, 413);
});

test("profile setup validates names, normalizes usernames, and isolates identity", async () => {
  const h = await harness();
  const put = (token, value) => h.request("/profile", token, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
  assert.equal(await (await h.request("/profile", "alice")).json(), null);
  for (const username of ["ab", "a".repeat(25), "a-b", "has space", "नाम"]) assert.equal((await put("alice", { displayName: "Alice", username })).status, 400);
  for (const displayName of [" ", "x".repeat(61), "Na\nme"]) assert.equal((await put("alice", { displayName, username: "alice_1" })).status, 400);
  const saved = await put("alice", { displayName: " Alice ", username: "ALICE_1", userId: "bob", approved: true });
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { displayName: "Alice", username: "alice_1" });
  assert.equal(await (await h.request("/profile", "bob")).json(), null);
  assert.equal((await put("bob", { displayName: "Bob", username: "Alice_1" })).status, 409);
  assert.equal((await put("alice", { displayName: "Alice", username: "another_name" })).status, 409);
  assert.equal((await put("alice", { displayName: "Alice Updated", username: "ALICE_1" })).status, 200);
});

test("preference writes are validated and use the authenticated owner", async () => {
  const h = await harness();
  const put = value => h.request("/preferences", "alice", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
  assert.equal((await put({ appearance: "Unknown", notifications: true })).status, 400);
  assert.equal((await put({ appearance: "Dark", notifications: "yes" })).status, 400);
  const result = await put({ appearance: "Dark", notifications: false, userId: "bob" });
  assert.equal(result.status, 200);
  assert.deepEqual(await (await h.request("/preferences", "alice")).json(), { appearance: "Dark", notifications: false });
  assert.deepEqual(await (await h.request("/preferences", "bob")).json(), { appearance: "System", notifications: true });
  assert.equal(h.preferences.has("bob"), false);
});

test("private media uses server-generated keys and denies another user", async () => {
  const h = await harness();
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1S8AAAAASUVORK5CYII=", "base64");
  const uploaded = await h.request("/media", "alice", { method: "POST", headers: { "Content-Type": "image/png" }, body: bytes });
  assert.equal(uploaded.status, 201);
  const { id, url } = await uploaded.json();
  assert.match(url, /users\/alice\//);
  assert.equal((await h.request(`/media/${id}`, "bob")).status, 404);
  assert.equal((await h.request(`/media/${id}`, "bob", { method: "DELETE" })).status, 404);
  assert.equal(h.media.has(id), true);
  assert.equal((await h.request(`/media/${id}`, "alice", { method: "DELETE" })).status, 204);
  assert.equal(h.media.has(id), false);
});

test("spoofed image MIME types and oversized bodies are rejected", async () => {
  const h = await harness();
  assert.equal((await h.request("/media", "alice", { method: "POST", headers: { "Content-Type": "image/png" }, body: "<svg><script/></svg>" })).status, 400);
  assert.equal((await h.request("/media", "alice", { method: "POST", body: new Uint8Array(5 * 1024 * 1024 + 1) })).status, 413);
  assert.equal(h.media.size, 0);
});

test("browser CORS permits configured origins and rejects other origins", async () => {
  const h = await harness();
  const allowed = await h.request("/preferences", undefined, { method: "OPTIONS", headers: { Origin: "http://localhost:8081", "Access-Control-Request-Method": "GET" } });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "http://localhost:8081");
  const denied = await h.request("/preferences", undefined, { method: "OPTIONS", headers: { Origin: "https://untrusted.test" } });
  assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
});
