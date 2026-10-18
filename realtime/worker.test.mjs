import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {transformSync}=require("esbuild");
function setup(){
 const sockets=[];let alarm;
 const ctx={getWebSockets:()=>sockets.filter(s=>!s.closed),acceptWebSocket:s=>sockets.push(s),storage:{setAlarm:async value=>{alarm=value;}}};
 class Socket{sent=[];closed=false;readyState=1;serializeAttachment(value){this.attachment=value;}deserializeAttachment(){return this.attachment;}send(value){this.sent.push(value);}close(code){this.closed=code;this.readyState=2;}}
 class Pair{constructor(){return {0:new Socket(),1:new Socket()};}}
 class Base{constructor(context){this.ctx=context;}}
 class Reply extends Response{constructor(body,init={}){super(body,init.status===101?{status:200}:init);if(init.status===101){Object.defineProperty(this,"status",{value:101});this.webSocket=init.webSocket;}}}
 const module={exports:{}};let consumed=false;
 const fetch=async(_url,init)=>{assert.equal(init.headers["X-Service-Key"],"local-key");const {ticket}=JSON.parse(init.body);if(ticket!=="valid-ticket"||consumed)return new Response("Unauthorized",{status:401});consumed=true;return Response.json({userId:"verified-user",expiresAt:Date.now()+60000});};
 const code=transformSync(fs.readFileSync(new URL("worker.mjs",import.meta.url),"utf8"),{format:"cjs",loader:"js"}).code;
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>{assert.equal(id,"cloudflare:workers");return {DurableObject:Base};},Request,Response:Reply,WebSocketPair:Pair,URL,Headers,AbortSignal,Date,fetch});
 const hub=new module.exports.UserHub(ctx);const names=[];
 const env={SERVICE_KEY:"local-key",API_URL:"https://api.example",CONNECTION_LIMITER:{limit:async()=>({success:true})},USER_HUB:{idFromName:name=>{names.push(name);return name;},get:()=>({fetch:(request,init)=>hub.fetch(typeof request==="string"?new Request(request,init):request)})}};
 return {worker:module.exports.default,hub,env,sockets,names,get alarm(){return alarm;}};
}
test("realtime accepts one-use server tickets and scopes sockets to verified identity",async()=>{
 const s=setup();
 const connect=ticket=>s.worker.fetch(new Request(`https://worker/connect?ticket=${ticket}`,{headers:{Upgrade:"websocket","X-Expires-At":String(Date.now()+999999999)}}),s.env);
 assert.equal((await connect("forged-ticket")).status,401);
 assert.equal((await connect("valid-ticket")).status,101);
 assert.deepEqual(s.names,["verified-user"]);
 assert.equal((await connect("valid-ticket")).status,401);
 assert.ok(s.alarm<=Date.now()+61000);
});
test("dispatch requires server credentials and carries no message content",async()=>{
 const s=setup();
 await s.hub.fetch(new Request("https://hub/connect",{headers:{Upgrade:"websocket","X-Expires-At":String(Date.now()+60000)}}));
 const dispatch=(key,kind)=>s.worker.fetch(new Request("https://worker/dispatch",{method:"POST",headers:{"X-Service-Key":key},body:JSON.stringify({userId:"verified-user",kind,text:"must never cross the socket"})}),s.env);
 assert.equal((await dispatch("forged","message")).status,401);
 assert.equal((await dispatch("local-key","message")).status,200);
 assert.deepEqual(s.sockets[0].sent,['{"type":"changed"}']);
 await dispatch("local-key","session");assert.equal(s.sockets[0].closed,4001);
});
test("expired sockets close and sockets cannot write chat content",async()=>{
 const s=setup();
 assert.equal((await s.hub.fetch(new Request("https://hub/connect",{headers:{Upgrade:"websocket","X-Expires-At":"1"}}))).status,401);
 await s.hub.fetch(new Request("https://hub/connect",{headers:{Upgrade:"websocket","X-Expires-At":String(Date.now()+60000)}}));
 s.hub.webSocketMessage(s.sockets[0],"forged message");assert.equal(s.sockets[0].closed,1008);
 await s.hub.fetch(new Request("https://hub/connect",{headers:{Upgrade:"websocket","X-Expires-At":String(Date.now()+60000)}}));
 s.sockets[1].attachment.expiresAt=1;await s.hub.alarm();assert.equal(s.sockets[1].closed,4001);
});
test("typing dispatch is authenticated, bounded, ephemeral and strips draft content",async()=>{
 const s=setup();await s.hub.fetch(new Request("https://hub/connect",{headers:{Upgrade:"websocket","X-Expires-At":String(Date.now()+60000)}}));
 const activity={conversationId:"12345678-1234-4234-9234-123456789012",userId:"peer",name:"Alex",typing:true,expiresAt:Date.now()+6000,text:"private draft"};
 const send=(a,key="local-key")=>s.worker.fetch(new Request("https://worker/dispatch",{method:"POST",headers:{"X-Service-Key":key},body:JSON.stringify({kind:"typing",userId:"verified-user",activity:a})}),s.env);
 assert.equal((await send(activity,"forged")).status,401);assert.equal((await send({...activity,expiresAt:Date.now()+60000})).status,400);
 assert.equal((await send(activity)).status,200);const packet=JSON.parse(s.sockets[0].sent[0]);assert.equal(packet.type,"typing");assert.equal(packet.name,"Alex");assert.equal(packet.text,undefined);assert.ok(packet.ttlMs>0&&packet.ttlMs<=6000);
 assert.equal((await send({...activity,typing:false})).status,200);assert.equal(JSON.parse(s.sockets[0].sent[1]).typing,false);
});
test("a closing socket cannot prevent the replacement socket receiving typing",async()=>{
 const s=setup();const request=()=>new Request("https://hub/connect",{headers:{Upgrade:"websocket","X-Expires-At":String(Date.now()+60000)}});
 await s.hub.fetch(request());await s.hub.fetch(request());s.sockets[0].closed=false;s.sockets[0].readyState=2;s.sockets[0].send=()=>{throw Error("Socket is closing");};
 const activity={conversationId:"12345678-1234-4234-9234-123456789012",userId:"peer",name:"Alex",typing:true,expiresAt:Date.now()+6000};
 assert.equal((await s.hub.fetch(new Request("https://hub/event",{method:"POST",body:JSON.stringify({kind:"typing",activity})}))).status,200);
 assert.equal(JSON.parse(s.sockets[1].sent[0]).type,"typing");
});
