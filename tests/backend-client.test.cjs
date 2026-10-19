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

test("Firebase client binds requests to its login and sends photos without leaking credentials to local URIs",async()=>{
 const originalFetch=global.fetch,originalUrl=process.env.EXPO_PUBLIC_API_URL;
 process.env.EXPO_PUBLIC_API_URL="https://api.test";
 try{
  const {createBackend}=await import("../src/lib/backend.ts");const api=createBackend(async()=>({token:"firebase-token",sessionNonce:"login-nonce"}));
  const requests=[];
  global.fetch=async(url,init)=>{
   if(url==="file:///private/photo.png"){assert.equal(init,undefined);return new Response(new Blob([new Uint8Array(26000)],{type:"image/png"}));}
   assert.equal(init.headers.Authorization,"Bearer firebase-token");assert.equal(init.headers["X-App-Session"],"login-nonce");requests.push({url,init});
   return url.endsWith("/images/retry")?Response.json({id:"image"}):Response.json({id:"message",imageId:"image"});
  };
  assert.deepEqual(await api.uploadChatImage("chat","file:///private/photo.png","retry"),{id:"image"});
  assert.equal(requests[0].init.body.size,26000);
  await api.sendMessage("chat","","retry",undefined,"image");
  assert.deepEqual(JSON.parse(requests[1].init.body),{text:"",retryId:"retry",imageId:"image"});
  assert.equal(requests[1].url,"https://api.test/conversations/chat/messages");
 }finally{global.fetch=originalFetch;if(originalUrl===undefined)delete process.env.EXPO_PUBLIC_API_URL;else process.env.EXPO_PUBLIC_API_URL=originalUrl;}
});
