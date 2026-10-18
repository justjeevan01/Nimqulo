import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { ServiceError, validId, type Identity, type TypingPublisher } from "./messenger-types.ts";
import type { MessengerStore } from "./messenger-store.ts";

export type AppEnv = { Variables: { userId: string; identity: Identity; requestId: string } };
export function messengerRoutes(store: MessengerStore,publishTyping?:TypingPublisher) {
  const app = new Hono<AppEnv>();
  const limit = bodyLimit({ maxSize: 24 * 1024 });
  for (const path of [
    "/session/activate", "/session", "/community", "/people", "/connections",
    "/connections/:id/decision", "/connections/:target", "/conversations/direct",
    "/groups", "/groups/:id", "/groups/:id/members", "/invitations/:id/decision",
    "/conversations/:id/messages", "/conversations/:id/read", "/conversations/:id/typing",
    "/blocks/:id", "/reports", "/device", "/events", "/moderation/reports",
    "/moderation/reports/:id", "/account", "/realtime/ticket", "/conversations/:id/access",
  ]) app.use(path, limit);
  app.post("/session/activate", async c => {
    const body = await c.req.json();
    validId(body.deviceId);
    await store.authorize(c.get("identity"), body.deviceId);
    return c.json({ ok: true });
  });
  app.get("/session", c=>c.json({id:c.get("userId"),sessionId:c.get("identity").sessionId}));
  app.get("/community", async c=>c.json(await store.snapshot(c.get("userId"))));
  app.get("/people", async c=>c.json(await store.lookup(c.get("userId"),c.req.query("username")||"")));
  app.post("/connections",async c=>{const b=await c.req.json();if(typeof b.targetId!=="string")throw new ServiceError(400,"Choose a person.");await store.requestConnection(c.get("userId"),b.targetId);return c.body(null,204);});
  app.post("/connections/:id/decision",async c=>{const b=await c.req.json();if(!["accept","decline","cancel"].includes(b.decision))throw new ServiceError(400,"Choose a decision.");await store.decideConnection(c.get("userId"),c.req.param("id"),b.decision);return c.body(null,204);});
  app.delete("/connections/:target",async c=>{await store.removeConnection(c.get("userId"),c.req.param("target"));return c.body(null,204);});
  app.post("/conversations/direct",async c=>{const b=await c.req.json();if(typeof b.targetId!=="string")throw new ServiceError(400,"Choose a connection.");return c.json(await store.direct(c.get("userId"),b.targetId));});
  app.post("/groups",async c=>{const b=await c.req.json();return c.json(await store.saveGroup(c.get("userId"),b.name,b.invitees));});
  app.put("/groups/:id",async c=>{const b=await c.req.json();return c.json(await store.saveGroup(c.get("userId"),b.name,b.invitees,c.req.param("id")));});
  app.post("/groups/:id/members",async c=>{
    const b=await c.req.json();if(typeof b.targetId!=="string"||!["Admin","Member","remove","transfer","leave"].includes(b.action))throw new ServiceError(400,"Choose a member action.");
    await store.manageMember(c.get("userId"),c.req.param("id"),b.targetId,b.action);return c.body(null,204);
  });
  app.post("/invitations/:id/decision",async c=>{const b=await c.req.json();if(!["accepted","declined"].includes(b.status))throw new ServiceError(400,"Choose a decision.");await store.decideInvitation(c.get("userId"),c.req.param("id"),b.status);return c.body(null,204);});
  app.get("/conversations/:id/messages",async c=>c.json(await store.messages(c.get("userId"),c.req.param("id"),c.req.query("before")===undefined?undefined:Number(c.req.query("before")))));
  app.post("/conversations/:id/messages",async c=>{const b=await c.req.json();return c.json(await store.send(c.get("userId"),c.req.param("id"),b.text,b.retryId,b.replyToId),201);});
  app.put("/conversations/:id/read",async c=>{const b=await c.req.json();await store.read(c.get("userId"),c.req.param("id"),b.seq);return c.body(null,204);});
  app.post("/conversations/:id/typing",async c=>{
    const body=await c.req.json();if(typeof body.typing!=="boolean")throw new ServiceError(400,"Invalid typing state.");
    const id=c.req.param("id"),user=c.get("userId");const {recipients,name}=await store.typingAudience(user,id);
    if(recipients.length){if(!publishTyping)throw new ServiceError(503,"Typing indicators are temporarily unavailable.");await publishTyping(recipients,{conversationId:id,userId:user,name,typing:body.typing,expiresAt:Date.now()+6000});}
    return c.body(null,204);
  });
  app.put("/blocks/:id",async c=>{const b=await c.req.json();if(typeof b.blocked!=="boolean")throw new ServiceError(400,"Choose a block action.");await store.block(c.get("userId"),c.req.param("id"),b.blocked);return c.body(null,204);});
  app.post("/reports",async c=>{const b=await c.req.json();if(typeof b.targetId!=="string")throw new ServiceError(400,"Choose a person to report.");return c.json(await store.report(c.get("userId"),b.targetId,b.reason),201);});
  app.put("/device",async c=>{const b=await c.req.json();await store.device(c.get("userId"),b.pushToken);return c.body(null,204);});
  app.get("/events",async c=>{
    const after=Number(c.req.query("after")||0);
    if(!Number.isSafeInteger(after)||after<0)throw new ServiceError(400,"Invalid event cursor.");
    const {rows}=await store.pool.query("SELECT id::text,kind,conversation_id FROM nimqulo_events WHERE user_id=$1 AND id>$2 ORDER BY id LIMIT 100",[c.get("userId"),after]);
    return c.json(rows);
  });
  app.get("/moderation/reports",async c=>c.json(await store.reports(c.get("userId"))));
  app.put("/moderation/reports/:id",async c=>{const b=await c.req.json();if(!["reviewed","dismissed"].includes(b.status)||typeof b.suspend!=="boolean")throw new ServiceError(400,"Invalid moderation action.");await store.moderate(c.get("userId"),c.req.param("id"),b.status,b.suspend);return c.body(null,204);});
  app.delete("/account",async c=>{const b=await c.req.json();if(b.confirm!=="DELETE")throw new ServiceError(400,"Type DELETE to confirm.");await store.deleteAccount(c.get("userId"));return c.json({status:"deleting"},202);});
  app.post("/realtime/ticket",async c=>{
    const {randomBytes}=await import("node:crypto");
    const ticket=randomBytes(32).toString("base64url");
    const {createHash}=await import("node:crypto");
    await store.pool.query("INSERT INTO nimqulo_socket_tickets(hash,user_id,session_id,expires_at) VALUES($1,$2,$3,now()+interval '30 seconds')",[createHash("sha256").update(ticket).digest("hex"),c.get("userId"),c.get("identity").sessionId]);
    return c.json({ticket,url:process.env.REALTIME_URL||null});
  });
  app.get("/conversations/:id/access",async c=>{validId(c.req.param("id"));const m=await store.member(store.pool,c.get("userId"),c.req.param("id"));return c.json({kind:m.kind});});
  return app;
}
