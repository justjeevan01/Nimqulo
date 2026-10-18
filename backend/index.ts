import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import { attachDatabasePool } from "@neon/functions";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";
import { createApp } from "./app";
import { createAuthenticator } from "./auth";
import { media, preferences, profiles } from "./schema";
import { ProfileConflict } from "./profile";
import { MessengerStore } from "./messenger-store";
import { createDelivery } from "./delivery";
import { createTypingPublisher } from "./typing";

for (const key of ["DATABASE_URL", "AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "CLERK_SECRET_KEY", "CLERK_ISSUER_URL"]) {
  if (!process.env[key]) throw new Error(`Missing backend environment variable: ${key}`);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 10000, query_timeout: 15000 });
attachDatabasePool(pool);
const db = drizzle(pool);
const files = new Files({ adapter: neon({ bucket: "assets" }) });
const origins = (process.env.APP_ORIGINS || "http://localhost:8081,http://localhost:8082,http://localhost:19006,triplyai://").split(",");
const messenger=new MessengerStore(pool,(process.env.OPERATOR_USER_IDS||"").split(",").filter(Boolean));
const deliver=createDelivery(messenger,{realtimeUrl:process.env.REALTIME_URL,serviceKey:process.env.REALTIME_SERVICE_KEY,clerkSecret:process.env.CLERK_SECRET_KEY!,deleteObject:key=>files.delete(key).then(()=>undefined)});

export default createApp({
  messenger, deliver,publishTyping:createTypingPublisher(process.env.REALTIME_URL,process.env.REALTIME_SERVICE_KEY),
  authenticate: createAuthenticator(process.env.CLERK_ISSUER_URL!, process.env.CLERK_SECRET_KEY!, origins),
  async getProfile(userId) {
    const [value] = await db.select({ displayName: profiles.displayName, username: profiles.username }).from(profiles).where(eq(profiles.userId, userId));
    return value || null;
  },
  async saveProfile(userId, value) {
    try {
      const [saved] = await db.insert(profiles).values({ userId, ...value }).onConflictDoUpdate({
        target: profiles.userId,
        set: { displayName: value.displayName, updatedAt: new Date() },
        setWhere: eq(profiles.username, value.username),
      }).returning({ displayName: profiles.displayName, username: profiles.username });
      if (!saved) throw new ProfileConflict("Your username cannot be changed during the pilot.");
      return saved;
    } catch (error) {
      const cause = (error as { cause?: { code?: string }; code?: string });
      if (cause.code === "23505" || cause.cause?.code === "23505") throw new ProfileConflict("That username is already taken. Choose another.");
      throw error;
    }
  },
  async getPreferences(userId) {
    const [value] = await db.select({ appearance: preferences.appearance, notifications: preferences.notifications,previews:preferences.previews }).from(preferences).where(eq(preferences.userId, userId));
    return value || { appearance: "System", notifications: true,previews:false };
  },
  async savePreferences(userId, value) {
    const [saved] = await db.insert(preferences).values({ userId, ...value }).onConflictDoUpdate({ target: preferences.userId, set: { ...value, updatedAt: new Date() } }).returning({ appearance: preferences.appearance, notifications: preferences.notifications,previews:preferences.previews });
    return saved;
  },
  async putMedia(value, bytes) {
    await files.upload(value.objectKey, bytes, { contentType: value.contentType });
    try { await db.insert(media).values(value); } catch (error) { await files.delete(value.objectKey).catch(() => {}); throw error; }
  },
  async getMedia(id, userId) { const [value] = await db.select().from(media).where(and(eq(media.id, id), eq(media.ownerId, userId))); return value; },
  async mediaUrl(key) { return files.url(key, { expiresIn: 3600 }); },
  async deleteMedia(value) { await files.delete(value.objectKey); await db.delete(media).where(and(eq(media.id, value.id), eq(media.ownerId, value.ownerId))); },
}, origins);
