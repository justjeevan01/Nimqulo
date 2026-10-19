import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import { attachDatabasePool } from "@neon/functions";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";
import { createApp } from "./app";
import { media, preferences, profiles } from "./schema";
import { ProfileConflict } from "./profile";
import { MessengerStore } from "./messenger-store";
import { createDelivery } from "./delivery";
import { createTypingPublisher } from "./typing";
import { cert,initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createFirebaseAuthenticator,firebaseSessionActive } from "./firebase-auth";
import { createAccessAdmin } from "./access-admin";
import { ServiceError } from "./messenger-types";

for (const key of ["DATABASE_URL", "AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "FIREBASE_ADMIN_CONFIG", "FIREBASE_PROJECT_ID"]) {
  if (!process.env[key]) throw new Error(`Missing backend environment variable: ${key}`);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 10000, query_timeout: 15000 });
attachDatabasePool(pool);
const db = drizzle(pool);
const files = new Files({ adapter: neon({ bucket: "assets" }) });
const origins = (process.env.APP_ORIGINS || "http://localhost:8081,http://localhost:8082,http://localhost:19006,triplyai://").split(",");
const messenger=new MessengerStore(pool,(process.env.OPERATOR_USER_IDS||"").split(",").filter(Boolean),{
  upload:async(key,bytes,contentType)=>{await files.upload(key,bytes,{contentType});},
  url:key=>files.url(key,{expiresIn:900}),
  delete:async key=>{await files.delete(key);},
});
const firebase=getAuth(initializeApp({credential:cert(JSON.parse(Buffer.from(process.env.FIREBASE_ADMIN_CONFIG!,"base64").toString("utf8"))),projectId:process.env.FIREBASE_PROJECT_ID}));
const deliver=createDelivery(messenger,{realtimeUrl:process.env.REALTIME_URL,serviceKey:process.env.REALTIME_SERVICE_KEY,identity:{
  async active(user:string,session:string){try{return firebaseSessionActive(await firebase.getUser(user),session);}catch(cause){if((cause as {code?:string}).code==="auth/user-not-found")return false;throw cause;}},
  async deleteUser(user:string){try{await firebase.deleteUser(user);}catch(cause){if((cause as {code?:string}).code!=="auth/user-not-found")throw cause;}},
},deleteObject:key=>files.delete(key).then(()=>undefined)});

export default createApp({
  accessAdmin:createAccessAdmin(firebase,messenger),
  messenger, deliver,publishTyping:createTypingPublisher(process.env.REALTIME_URL,process.env.REALTIME_SERVICE_KEY),
  authenticate:createFirebaseAuthenticator(firebase),
  async getProfile(userId) {
    const [value] = await db.select({ displayName: profiles.displayName, username: profiles.username }).from(profiles).where(eq(profiles.userId, userId));
    if(!value)return null;
    const {rows:[account]}=await pool.query("SELECT avatar_key FROM nimqulo_accounts WHERE user_id=$1",[userId]);
    return {...value,...(account?.avatar_key?{avatarUrl:await files.url(account.avatar_key,{expiresIn:900})}:{})};
  },
  async saveAvatar(userId,mediaId){
    const [image]=await db.select().from(media).where(and(eq(media.id,mediaId),eq(media.ownerId,userId)));
    if(!image)throw new ServiceError(404,"Photo not found.");
    await messenger.mutate(userId,async client=>{await client.query("UPDATE nimqulo_accounts SET avatar_key=$2 WHERE user_id=$1",[userId,image.objectKey]);await messenger.event(client,[userId],"profile");});
    return {url:await files.url(image.objectKey,{expiresIn:900})};
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
