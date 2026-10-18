import { DurableObject } from "cloudflare:workers";
// Invalidation hints and ephemeral typing metadata only. Neon authorizes recipients.
export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if(url.pathname==="/health")return Response.json({ok:true});
    if(!env.SERVICE_KEY||!env.API_URL)return new Response("Service unavailable",{status:503});
    if(url.pathname==="/connect"&&request.method==="GET") {
      if(request.headers.get("upgrade")?.toLowerCase()!=="websocket")return new Response("WebSocket required",{status:426});
      const limit=await env.CONNECTION_LIMITER.limit({key:request.headers.get("CF-Connecting-IP")||"local"});
      if(!limit.success)return new Response("Try again later",{status:429});
      const ticket=url.searchParams.get("ticket");
      if(!ticket||ticket.length>100)return new Response("Unauthorized",{status:401});
      const auth=await fetch(new URL("/internal/realtime",env.API_URL),{method:"POST",headers:{"Content-Type":"application/json","X-Service-Key":env.SERVICE_KEY},body:JSON.stringify({ticket}),signal:AbortSignal.timeout(10000),redirect:"manual"});
      if(!auth.ok)return new Response("Unauthorized",{status:401});
      const identity=await auth.json();
      if(typeof identity.userId!=="string"||!Number.isFinite(identity.expiresAt))return new Response("Unauthorized",{status:401});
      const hub=env.USER_HUB.get(env.USER_HUB.idFromName(identity.userId));
      const headers=new Headers(request.headers);headers.set("X-Expires-At",String(identity.expiresAt));
      return hub.fetch(new Request("https://hub/connect",{headers}));
    }
    if(url.pathname==="/dispatch"&&request.method==="POST") {
      if(request.headers.get("X-Service-Key")!==env.SERVICE_KEY)return new Response("Unauthorized",{status:401});
      const text=await request.text();if(text.length>2048)return new Response("Too large",{status:413});
      let event;try{event=JSON.parse(text);}catch{return new Response("Invalid JSON",{status:400});}
      if(typeof event.userId!=="string"||event.userId.length>100||typeof event.kind!=="string")return new Response("Invalid event",{status:400});
      let activity;
      if(event.kind==="typing"){
        const a=event.activity;
        if(!a||typeof a.conversationId!=="string"||!/^[0-9a-f-]{36}$/i.test(a.conversationId)||typeof a.userId!=="string"||a.userId.length>100||typeof a.name!=="string"||a.name.length>120||typeof a.typing!=="boolean"||!Number.isFinite(a.expiresAt)||a.expiresAt<=Date.now()||a.expiresAt>Date.now()+7000)return new Response("Invalid typing event",{status:400});
        activity={conversationId:a.conversationId,userId:a.userId,name:a.name,typing:a.typing,expiresAt:a.expiresAt};
      }
      return env.USER_HUB.get(env.USER_HUB.idFromName(event.userId)).fetch("https://hub/event",{method:"POST",body:JSON.stringify({kind:event.kind,...(activity?{activity}:{})})});
    }
    return new Response("Not found",{status:404});
  },
};
export class UserHub extends DurableObject {
  async fetch(request) {
    if(new URL(request.url).pathname==="/event") {
      const {kind,activity}=await request.json();
      for(const socket of this.ctx.getWebSockets()) {
        // Hibernation can still enumerate a socket during its close handshake.
        if(socket.readyState!==1)continue;
        if(kind==="session"||socket.deserializeAttachment().expiresAt<=Date.now())socket.close(4001,"Refresh session");
        else try{socket.send(kind==="typing"?JSON.stringify({type:"typing",...activity,ttlMs:Math.max(0,Math.min(6000,activity.expiresAt-Date.now()))}):'{"type":"changed"}');}catch{try{socket.close(1011,"Reconnect");}catch{/* The peer already closed. */}}
      }
      return Response.json({ok:true});
    }
    if(request.headers.get("upgrade")?.toLowerCase()!=="websocket")return new Response("WebSocket required",{status:426});
    const expiresAt=Number(request.headers.get("X-Expires-At"));
    if(expiresAt<=Date.now()||expiresAt>Date.now()+65000)return new Response("Expired",{status:401});
    for(const socket of this.ctx.getWebSockets())socket.close(4001,"New connection");
    const {0:client,1:server}=new WebSocketPair();
    this.ctx.acceptWebSocket(server);server.serializeAttachment({expiresAt});
    await this.ctx.storage.setAlarm(expiresAt);
    return new Response(null,{status:101,webSocket:client});
  }
  async alarm() {
    for(const socket of this.ctx.getWebSockets())if(socket.deserializeAttachment().expiresAt<=Date.now())socket.close(4001,"Refresh session");
  }
  webSocketMessage(socket){socket.close(1008,"Use the authenticated message API");}
  // Compatibility dates after 2026-04-07 automatically reply to close frames.
  webSocketClose(){}
  webSocketError(socket){socket.close(1011,"Reconnect");}
}
