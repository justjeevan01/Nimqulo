import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { parseProfile, ProfileConflict, type Profile } from "./profile.ts";
import { timingSafeEqual, createHash } from "node:crypto";
import { parseTriggerDelivery } from "@neon/functions/triggers";
import { waitUntil } from "@neon/functions";
import { messengerRoutes, type AppEnv } from "./messenger-routes.ts";
import { ServiceError, type Identity, type TypingPublisher } from "./messenger-types.ts";
import type { MessengerStore } from "./messenger-store.ts";

export type Preferences = { appearance: string; notifications: boolean; previews?:boolean };
export type StoredMedia = { id: string; ownerId: string; objectKey: string; contentType: string; size: number };
export type Services = {
  authenticate: (token: string) => Promise<Identity>;
  messenger?: MessengerStore;
  deliver?: () => Promise<void>;
  publishTyping?:TypingPublisher;
  getProfile: (userId: string) => Promise<Profile | null>;
  saveProfile: (userId: string, value: Profile) => Promise<Profile>;
  getPreferences: (userId: string) => Promise<Preferences>;
  savePreferences: (userId: string, value: Preferences) => Promise<Preferences>;
  putMedia: (value: StoredMedia, body: Uint8Array) => Promise<void>;
  getMedia: (id: string, userId: string) => Promise<StoredMedia | undefined>;
  mediaUrl: (key: string) => Promise<string>;
  deleteMedia: (value: StoredMedia) => Promise<void>;
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function createApp(services: Services, allowedOrigins: string[]) {
  const app = new Hono<AppEnv>();
  app.use("*", async(c,next)=>{const id=randomUUID();c.set("requestId",id);c.header("X-Request-ID",id);await next();});
  app.use("*", cors({ origin: origin => allowedOrigins.includes(origin) ? origin : undefined,
    allowMethods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"], allowHeaders: ["Authorization", "Content-Type"] }));
  app.get("/health", c => c.json({ ok: true, service: "nimqulo-api" }));
  app.post("/internal/sweep",async c=>{
    const parsed=await parseTriggerDelivery(c.req.raw);
    if(!parsed.ok||parsed.invocation.type!=="schedule")return c.json({error:"Invalid trigger."},401);
    await services.deliver?.();return c.json({ok:true});
  });
  app.post("/internal/realtime",bodyLimit({maxSize:2048}),async c=>{
    const secret=process.env.REALTIME_SERVICE_KEY;
    const incoming=c.req.header("X-Service-Key")||"";
    if(!secret||Buffer.byteLength(incoming)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(secret),Buffer.from(incoming))||!services.messenger)return c.json({error:"Unauthorized"},401);
    const {ticket}=await c.req.json();
    if(typeof ticket!=="string"||ticket.length>100)return c.json({error:"Invalid ticket"},401);
    const {rows:[r]}=await services.messenger.pool.query("DELETE FROM nimqulo_socket_tickets WHERE hash=$1 AND expires_at>now() RETURNING user_id,session_id",[createHash("sha256").update(ticket).digest("hex")]);
    if(!r)return c.json({error:"Expired ticket"},401);
    const {rows:[active]}=await services.messenger.pool.query("SELECT 1 FROM nimqulo_devices d JOIN nimqulo_accounts a USING(user_id) WHERE d.user_id=$1 AND d.session_id=$2 AND a.status='active' AND a.approved",[r.user_id,r.session_id]);
    if(!active)return c.json({error:"Session ended"},401);
    return c.json({userId:r.user_id,expiresAt:Date.now()+60000});
  });
  app.use("*", async (c, next) => {
    const token = c.req.header("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return c.json({ error: "Sign in to continue." }, 401);
    let user;
    try { user = await services.authenticate(token); } catch(error) { if(error instanceof ServiceError)throw error;return c.json({ error: "Session verification failed. Please sign in again." }, 401); }
    if (!user.approved) return c.json({ error: "Access requires administrator approval.",code:"NOT_APPROVED" }, 403);
    c.set("userId", user.id);
    c.set("identity",user);
    if(services.messenger&&c.req.path!=="/session/activate")await services.messenger.authorize(user);
    if(services.messenger&&c.req.path!=="/session/activate")await services.messenger.session.run(user,()=>next());
    else await next();
    if(services.deliver&&c.req.method!=="GET"&&!c.req.path.endsWith("/typing")&&c.res.ok)waitUntil(services.deliver().catch(()=>console.error(JSON.stringify({event:"sweep_failed",requestId:c.get("requestId")}))));
  });
  if(services.messenger)app.route("/",messengerRoutes(services.messenger,services.publishTyping));
  app.get("/profile", async c => c.json(await services.getProfile(c.get("userId"))));
  app.put("/profile", bodyLimit({ maxSize: 2048 }), async c => {
    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON." }, 400); }
    const value = parseProfile(body);
    if (!value) return c.json({ error: "Enter a name of 1–60 characters and a username of 3–24 letters, numbers, or underscores." }, 400);
    try { return c.json(await services.saveProfile(c.get("userId"), value)); }
    catch (error) {
      if (error instanceof ProfileConflict) return c.json({ error: error.message }, 409);
      throw error;
    }
  });
  app.get("/preferences", async c => c.json(await services.getPreferences(c.get("userId"))));
  app.put("/preferences", bodyLimit({ maxSize: 2048 }), async c => {
    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON." }, 400); }
    if (!["System", "Dark", "Light"].includes(body?.appearance) || typeof body?.notifications !== "boolean") return c.json({ error: "Invalid preferences." }, 400);
    if(body.previews!==undefined&&typeof body.previews!=="boolean")return c.json({error:"Invalid preferences."},400);
    return c.json(await services.savePreferences(c.get("userId"), { appearance: body.appearance, notifications: body.notifications, ...(body.previews!==undefined?{previews:body.previews}:{}) }));
  });
  app.post("/media", bodyLimit({ maxSize: MAX_IMAGE_BYTES }), async c => {
    const body = new Uint8Array(await c.req.arrayBuffer());
    // Only raster images; validate bytes rather than trusting a filename or MIME header.
    const type = body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff ? "image/jpeg"
      : [137,80,78,71,13,10,26,10].every((n,i) => body[i] === n) ? "image/png"
      : Buffer.from(body.subarray(0,4)).toString() === "RIFF" && Buffer.from(body.subarray(8,12)).toString() === "WEBP" ? "image/webp" : undefined;
    if (!type) return c.json({ error: "Choose a JPEG, PNG, or WebP image." }, 400);
    const id = randomUUID(), ownerId = c.get("userId");
    const value = { id, ownerId, objectKey: `users/${ownerId}/${id}`, contentType: type, size: body.length };
    await services.putMedia(value, body);
    return c.json({ id, url: await services.mediaUrl(value.objectKey) }, 201);
  });
  app.get("/media/:id", async c => {
    const value = await services.getMedia(c.req.param("id"), c.get("userId"));
    if (!value) return c.json({ error: "Image not found." }, 404);
    return c.json({ id: value.id, url: await services.mediaUrl(value.objectKey) });
  });
  app.delete("/media/:id", async c => {
    const value = await services.getMedia(c.req.param("id"), c.get("userId"));
    if (!value) return c.json({ error: "Image not found." }, 404);
    await services.deleteMedia(value);
    return c.body(null, 204);
  });
  app.onError((error,c) => {
    if(error instanceof ServiceError){
      if(error.status===429){c.header("Retry-After","60");console.warn(JSON.stringify({event:"rate_limited",requestId:c.get("requestId")}));}
      if(error.status>=500)console.error(JSON.stringify({event:"service_unavailable",requestId:c.get("requestId")}));
      return c.json({error:error.message,code:error.code,requestId:c.get("requestId")},error.status);
    }
    if(error instanceof SyntaxError)return c.json({error:"Invalid JSON."},400);
    if (error instanceof HTTPException && error.status === 413) return c.json({ error: c.req.path==="/media"?"Choose an image smaller than 5 MB.":"The request is too large." }, 413);
    console.error(JSON.stringify({event:"request_failed",name:error.name,requestId:c.get("requestId")}));
    return c.json({ error: "The service is unavailable. Please try again." }, 503);
  });
  return app;
}
