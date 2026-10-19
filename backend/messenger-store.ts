import { createHash, randomUUID } from "node:crypto";
import { imageContentType } from "./image.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Pool, PoolClient } from "pg";
import { ServiceError, validId, validText, type Identity, type PersonRecord, type MessageRecord, type Snapshot } from "./messenger-types.ts";

type DB = Pick<PoolClient, "query">;
type ImageStorage = { upload:(key:string,bytes:Uint8Array,contentType:string)=>Promise<void>; url:(key:string)=>Promise<string>; delete:(key:string)=>Promise<void> };
const pair = (a: string, b: string) => [a, b].sort();
const person = (r: Record<string, unknown>): PersonRecord => ({ id: String(r.user_id), name: String(r.display_name), username: String(r.username), connected: r.connected === true, blocked: r.blocked === true, requested: r.requested === true, ...(typeof r.avatar_url==="string"?{avatar:{uri:r.avatar_url}}:{}) });

// All pilot mutations share a transaction lock. This also makes event cursor
// order match commit order; sequence allocation alone does not provide that.
export class MessengerStore {
  readonly session = new AsyncLocalStorage<Identity>();
  readonly pool: Pool;
  readonly operators: readonly string[];
  readonly imageStorage?:ImageStorage;
  constructor(pool: Pool, operators: readonly string[] = [], imageStorage?:ImageStorage) { this.pool=pool; this.operators=operators;this.imageStorage=imageStorage; }
  async transaction<T>(action: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.pool.connect();
    try {
      await db.query("BEGIN");
      await db.query("SET LOCAL lock_timeout='10s'");
      await db.query("SELECT pg_advisory_xact_lock(817235002)");
      const result = await action(db);
      await db.query("COMMIT");
      return result;
    } catch (error) { await db.query("ROLLBACK"); throw error; }
    finally { db.release(); }
  }
  async event(db: DB, users: readonly string[], kind: string, conversation?: string, message?: string) {
    for (const id of new Set(users)) await db.query("INSERT INTO nimqulo_events(user_id,kind,conversation_id,message_id,push_done) VALUES($1,$2,$3,$4,$5)", [id, kind, conversation || null, message || null, kind !== "message"]);
  }
  async person(row:Record<string,unknown>){return person(typeof row.avatar_key==="string"&&this.imageStorage?{...row,avatar_url:await this.imageStorage.url(row.avatar_key)}:row);}
  async account(db: DB, id: string) {
    const identity=this.session.getStore();
    const acting=!identity||identity.id===id;
    const { rows: [row] } = await db.query("SELECT * FROM nimqulo_accounts WHERE user_id=$1", [id]);
    if (!row) throw new ServiceError(403, acting?"Access requires administrator approval.":"This person is unavailable.", acting?"NOT_APPROVED":"PERSON_UNAVAILABLE");
    if (row.status !== "active") throw new ServiceError(403, acting?(row.status === "suspended" ? "Your account is suspended." : "This account is being deleted."):"This person is unavailable.", acting?(row.status === "suspended" ? "SUSPENDED" : "ACCOUNT_DELETED"):"PERSON_UNAVAILABLE");
    if (!row.approved) throw new ServiceError(403, acting?"Access requires administrator approval.":"This person is unavailable.", acting?"NOT_APPROVED":"PERSON_UNAVAILABLE");
    if(identity?.id===id&&!(await db.query("SELECT 1 FROM nimqulo_devices WHERE user_id=$1 AND session_id=$2 AND NOT revoked",[id,identity.sessionId])).rowCount)throw new ServiceError(409,"Your account is active on another phone.","SESSION_REPLACED");
  }
  async authorize(identity: Identity, activate?: string) {
    if (!identity.sessionId || !identity.sessionStarted) throw new ServiceError(401, "Please sign in again.");
    if (activate) validId(activate);
    return this.transaction(async db => {
      await db.query("INSERT INTO nimqulo_accounts(user_id,approved,avatar_url) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET approved=CASE WHEN nimqulo_accounts.status='active' THEN EXCLUDED.approved ELSE false END,avatar_url=EXCLUDED.avatar_url", [identity.id, identity.approved,identity.avatarUrl||null]);
      const {rows:[pilot]}=await db.query("SELECT count(*)::int AS n FROM nimqulo_accounts WHERE approved AND status='active'");
      if(pilot.n>20)throw new ServiceError(403,"The pilot has reached its 20-person limit.","PILOT_FULL");
      await this.account(db, identity.id);
      const { rows: [device] } = await db.query("SELECT * FROM nimqulo_devices WHERE user_id=$1 FOR UPDATE", [identity.id]);
      if(device?.session_id===identity.sessionId&&device.revoked)throw new ServiceError(401,"This session has ended. Please sign in again.","SESSION_EXPIRED");
      if (activate) {
        if (device && ((device.session_id!==identity.sessionId && Number(device.session_started) >= identity.sessionStarted!) || (device.session_id === identity.sessionId && device.device_id !== activate))) throw new ServiceError(409, "Your account is active on another phone.", "SESSION_REPLACED");
        const changed = device && (device.session_id !== identity.sessionId || device.device_id !== activate);
        await db.query(`INSERT INTO nimqulo_devices(user_id,session_id,session_started,device_id) VALUES($1,$2,$3,$4)
          ON CONFLICT(user_id) DO UPDATE SET session_id=EXCLUDED.session_id,session_started=EXCLUDED.session_started,device_id=EXCLUDED.device_id,
          push_token=CASE WHEN nimqulo_devices.session_id=EXCLUDED.session_id THEN nimqulo_devices.push_token ELSE NULL END,revoked=false,updated_at=now()`, [identity.id, identity.sessionId, identity.sessionStarted, activate]);
        if (changed) await this.event(db, [identity.id], "session");
      } else if (!device || device.session_id !== identity.sessionId) throw new ServiceError(409, "Your account is active on another phone. Please sign in again.", "SESSION_REPLACED");
      const { rows: [rate] } = await db.query(`INSERT INTO nimqulo_rate_limits(user_id,bucket,requests) VALUES($1,floor(extract(epoch from now())/60),1)
        ON CONFLICT(user_id,bucket) DO UPDATE SET requests=nimqulo_rate_limits.requests+1 RETURNING requests`, [identity.id]);
      if (rate.requests > 120) throw new ServiceError(429, "Too many requests. Please wait a minute.", "RATE_LIMITED");
    });
  }
  async blocked(db: DB, a: string, b: string) {
    return !!(await db.query("SELECT 1 FROM nimqulo_blocks WHERE (owner_id=$1 AND target_id=$2) OR (owner_id=$2 AND target_id=$1)", [a,b])).rowCount;
  }
  async connected(db: DB, a: string, b: string) {
    const [low, high] = pair(a,b);
    if (a === b || await this.blocked(db,a,b) || !(await db.query("SELECT 1 FROM nimqulo_connections WHERE low_id=$1 AND high_id=$2 AND status='accepted'", [low,high])).rowCount) throw new ServiceError(403, "An accepted connection is required.");
    await this.account(db,b);
  }
  async member(db: DB, user: string, conversation: string) {
    await this.account(db,user);
    validId(conversation);
    const { rows: [row] } = await db.query(`SELECT m.*, c.kind,c.name,c.next_seq FROM nimqulo_memberships m JOIN nimqulo_conversations c ON c.id=m.conversation_id
      WHERE m.conversation_id=$1 AND m.user_id=$2 AND m.end_seq IS NULL`, [conversation,user]);
    if (!row) throw new ServiceError(403, "You no longer have access to this conversation.", "MEMBERSHIP_ENDED");
    return row;
  }
  async members(db: DB, conversation: string): Promise<string[]> {
    return (await db.query("SELECT user_id FROM nimqulo_memberships WHERE conversation_id=$1 AND end_seq IS NULL", [conversation])).rows.map(r=>r.user_id);
  }
  async mutate<T>(user: string, action: (db: PoolClient) => Promise<T>) {
    return this.transaction(async db=>{await this.account(db,user); return action(db);});
  }
  async lookup(user: string, username: string) {
    await this.account(this.pool,user);
    if (!/^[a-z0-9_]{3,24}$/.test(username.toLowerCase())) return [];
    const { rows } = await this.pool.query(`SELECT p.*,a.avatar_url,a.avatar_key FROM nimqulo_profiles p JOIN nimqulo_accounts a USING(user_id)
      WHERE p.username=$1 AND p.user_id<>$2 AND a.approved AND a.status='active'
      AND NOT EXISTS(SELECT 1 FROM nimqulo_blocks b WHERE (b.owner_id=$2 AND b.target_id=p.user_id) OR (b.target_id=$2 AND b.owner_id=p.user_id))`, [username.toLowerCase(),user]);
    return Promise.all(rows.map(row=>this.person(row)));
  }
  async requestConnection(user: string, target: string) {
    return this.mutate(user,async db=>{
      await this.account(db,target);
      if (user===target || await this.blocked(db,user,target)) throw new ServiceError(403,"This connection is unavailable.");
      if (!(await db.query("SELECT 1 FROM nimqulo_profiles WHERE user_id=$1",[target])).rowCount) throw new ServiceError(404,"User unavailable.");
      const [low,high]=pair(user,target);
      const {rows:[existing]}=await db.query("SELECT * FROM nimqulo_connections WHERE low_id=$1 AND high_id=$2",[low,high]);
      if (existing && ["accepted","pending"].includes(existing.status)) throw new ServiceError(409,existing.status==="accepted"?"Already connected.":"A request is already pending.");
      await db.query(`INSERT INTO nimqulo_connections(id,low_id,high_id,requester_id,status) VALUES($1,$2,$3,$4,'pending')
        ON CONFLICT(low_id,high_id) DO UPDATE SET requester_id=$4,status='pending',updated_at=now()`,[randomUUID(),low,high,user]);
      await this.event(db,[user,target],"connection");
    });
  }
  async decideConnection(user:string,id:string,decision:"accept"|"decline"|"cancel"|"remove") {
    validId(id);
    return this.mutate(user,async db=>{
      const {rows:[r]}=await db.query("SELECT * FROM nimqulo_connections WHERE id=$1 AND $2 IN(low_id,high_id) FOR UPDATE",[id,user]);
      if (!r) throw new ServiceError(404,"Request unavailable.");
      const target=r.low_id===user?r.high_id:r.low_id;
      if (decision==="remove") {
        if(r.status!=="accepted") throw new ServiceError(409,"This connection has changed.");
      } else {
        if(r.status!=="pending") throw new ServiceError(409,"This request has already been decided.");
        if((decision==="cancel")!==(r.requester_id===user)) throw new ServiceError(403,"You cannot decide this request.");
      }
      if(decision==="accept") { await this.account(db,target); if(await this.blocked(db,user,target)) throw new ServiceError(403,"This connection is unavailable."); }
      await db.query("UPDATE nimqulo_connections SET status=$2,updated_at=now() WHERE id=$1",[id,decision==="accept"?"accepted":decision==="decline"?"declined":"cancelled"]);
      await this.event(db,[user,target],"connection");
    });
  }
  async removeConnection(user:string,target:string) {
    const [low,high]=pair(user,target);
    const {rows:[r]}=await this.pool.query("SELECT id FROM nimqulo_connections WHERE low_id=$1 AND high_id=$2",[low,high]);
    if(!r) throw new ServiceError(404,"Connection unavailable.");
    return this.decideConnection(user,r.id,"remove");
  }
  async direct(user:string,target:string) {
    return this.mutate(user,async db=>{
      await this.connected(db,user,target);
      const key=JSON.stringify(pair(user,target));
      const {rows:[existing]}=await db.query("SELECT id FROM nimqulo_conversations WHERE direct_pair=$1",[key]);
      if(existing)return {id:existing.id};
      const id=randomUUID();
      await db.query("INSERT INTO nimqulo_conversations(id,kind,direct_pair) VALUES($1,'direct',$2)",[id,key]);
      for(const who of [user,target]) await db.query("INSERT INTO nimqulo_memberships(id,conversation_id,user_id,role,start_seq) VALUES($1,$2,$3,'Member',1)",[randomUUID(),id,who]);
      await this.event(db,[user,target],"conversation",id);
      return {id};
    });
  }
  async invite(db:DB,user:string,conversation:string,ids:readonly string[]) {
    const m=await this.member(db,user,conversation);
    if(m.kind!=="group"||m.role==="Member")throw new ServiceError(403,"Only group administrators can invite connections.");
    if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.length>19)throw new ServiceError(400,"Choose up to 19 connections.");
    for(const target of ids) {
      if(typeof target!=="string")throw new ServiceError(400,"Invalid invitee.");
      await this.connected(db,user,target);
      if((await db.query("SELECT 1 FROM nimqulo_memberships WHERE conversation_id=$1 AND user_id=$2 AND end_seq IS NULL",[conversation,target])).rowCount)continue;
      await db.query("INSERT INTO nimqulo_invitations(id,conversation_id,inviter_id,recipient_id,status) VALUES($1,$2,$3,$4,'pending') ON CONFLICT(conversation_id,recipient_id) WHERE status='pending' DO NOTHING",[randomUUID(),conversation,user,target]);
      await this.event(db,[target],"invitation",conversation);
    }
  }
  async saveGroup(user:string,name:string,ids:readonly string[],id?:string) {
    validText(name,50); if(id)validId(id);
    return this.mutate(user,async db=>{
      if(!(await db.query("SELECT 1 FROM nimqulo_profiles WHERE user_id=$1",[user])).rowCount)throw new ServiceError(409,"Complete your profile first.");
      const groupId=id||randomUUID();
      if(id){const m=await this.member(db,user,id);if(m.kind!=="group"||m.role==="Member")throw new ServiceError(403,"Only group administrators can edit this group.");await db.query("UPDATE nimqulo_conversations SET name=$2 WHERE id=$1",[id,name.trim()]);}
      else {await db.query("INSERT INTO nimqulo_conversations(id,kind,name) VALUES($1,'group',$2)",[groupId,name.trim()]);await db.query("INSERT INTO nimqulo_memberships(id,conversation_id,user_id,role,start_seq) VALUES($1,$2,$3,'Owner',1)",[randomUUID(),groupId,user]);}
      await this.invite(db,user,groupId,ids);
      await this.event(db,await this.members(db,groupId),"group",groupId);
      return {id:groupId};
    });
  }
  async decideInvitation(user:string,id:string,status:"accepted"|"declined") {
    validId(id);
    return this.mutate(user,async db=>{
      const {rows:[r]}=await db.query("SELECT * FROM nimqulo_invitations WHERE id=$1 AND recipient_id=$2 FOR UPDATE",[id,user]);
      if(!r||r.status!=="pending")throw new ServiceError(409,"This invitation is no longer pending.");
      if(status==="accepted") {
        const m=await this.member(db,r.inviter_id,r.conversation_id);
        if(m.role==="Member")throw new ServiceError(403,"This invitation is no longer valid.");
        await this.connected(db,r.inviter_id,user);
        await db.query("SELECT id FROM nimqulo_conversations WHERE id=$1 FOR UPDATE",[r.conversation_id]);
        if((await this.members(db,r.conversation_id)).length>=20)throw new ServiceError(409,"This group already has 20 members.");
        await db.query("INSERT INTO nimqulo_memberships(id,conversation_id,user_id,role,start_seq) SELECT $1,id,$2,'Member',next_seq+1 FROM nimqulo_conversations WHERE id=$3 ON CONFLICT DO NOTHING",[randomUUID(),user,r.conversation_id]);
      }
      await db.query("UPDATE nimqulo_invitations SET status=$2 WHERE id=$1",[id,status]);
      await this.event(db,[user,...await this.members(db,r.conversation_id)],"group",r.conversation_id);
    });
  }
  async manageMember(user:string,id:string,target:string,action:"Admin"|"Member"|"remove"|"transfer"|"leave") {
    return this.mutate(user,async db=>{
      const actor=await this.member(db,user,id);
      if(actor.kind!=="group")throw new ServiceError(400,"This is not a group.");
      const member=await this.member(db,target,id);
      const audience=await this.members(db,id);
      if(action==="leave") {if(target!==user)throw new ServiceError(403,"Invalid leave request.");if(member.role==="Owner"&&audience.length>1)throw new ServiceError(409,"Transfer ownership before leaving.");}
      else if(action==="transfer") {if(actor.role!=="Owner"||target===user)throw new ServiceError(403,"Only the owner can transfer ownership.");await db.query("UPDATE nimqulo_memberships SET role='Admin' WHERE id=$1",[actor.id]);}
      else if(action==="remove") {if(target===user||member.role==="Owner"||actor.role==="Member"||(actor.role==="Admin"&&member.role!=="Member"))throw new ServiceError(403,"You cannot remove this member.");}
      else if(actor.role!=="Owner"||member.role==="Owner")throw new ServiceError(403,"Only the owner can change administrator roles.");
      if(action==="remove"||action==="leave") {
        await db.query("UPDATE nimqulo_memberships SET end_seq=$2 WHERE id=$1",[member.id,actor.next_seq]);
        await db.query("UPDATE nimqulo_invitations SET status='declined' WHERE conversation_id=$1 AND inviter_id=$2 AND status='pending'",[id,target]);
      } else await db.query("UPDATE nimqulo_memberships SET role=$2 WHERE id=$1",[member.id,action==="transfer"?"Owner":action]);
      await this.event(db,audience,"group",id);
    });
  }
  async messageRecord(db:DB,id:string,viewer:string):Promise<MessageRecord> {
    const {rows:[r]}=await db.query(`SELECT m.*,p.display_name,p.username,a.avatar_url,a.avatar_key,
      original.seq AS reply_seq,original.body AS reply_body,original.image_id AS reply_image,original.deleted AS reply_deleted,original.author_id AS reply_author,op.display_name AS reply_name,
      membership.start_seq AS viewer_start,receipts.total,receipts.seen
      FROM nimqulo_messages m LEFT JOIN nimqulo_profiles p ON p.user_id=m.author_id LEFT JOIN nimqulo_accounts a ON a.user_id=m.author_id
      LEFT JOIN nimqulo_messages original ON original.id=m.reply_to_id LEFT JOIN nimqulo_profiles op ON op.user_id=original.author_id
      LEFT JOIN nimqulo_memberships membership ON membership.conversation_id=m.conversation_id AND membership.user_id=$2 AND membership.end_seq IS NULL
      LEFT JOIN LATERAL(SELECT count(*)::int AS total,count(*) FILTER(WHERE read_seq>=m.seq)::int AS seen FROM nimqulo_memberships recipients
        WHERE recipients.conversation_id=m.conversation_id AND recipients.user_id<>m.author_id AND recipients.start_seq<=m.seq AND (recipients.end_seq IS NULL OR recipients.end_seq>=m.seq)) receipts ON true
      WHERE m.id=$1`,[id,viewer]);
    const hidden=r.deleted||r.reply_deleted||!r.viewer_start||Number(r.reply_seq)<Number(r.viewer_start);
    return {id:r.id,conversationId:r.conversation_id,authorId:r.author_id,retryId:r.retry_id,seq:Number(r.seq),text:r.deleted?"Message deleted":r.body,deleted:r.deleted,createdAt:new Date(r.created_at).toISOString(),sender:await this.person({user_id:r.author_id,display_name:r.display_name||"Deleted account",username:r.username||"",avatar_url:r.avatar_url,avatar_key:r.avatar_key}),readBy:r.seen,recipientCount:r.total,
      ...(!r.deleted&&r.image_id?{imageId:r.image_id}:{}),
      ...(!r.deleted&&r.reply_to_id?{reply:{id:r.reply_to_id,authorId:hidden?"":r.reply_author,name:hidden?"Message":r.reply_name||"Deleted account",text:hidden?"Original message unavailable":String(r.reply_body|| (r.reply_image?"Photo":"")).slice(0,240),...(hidden?{unavailable:true}:{})}}:{})};
  }
  async chatAccess(db:DB,user:string,id:string) {
    const member=await this.member(db,user,id);
    if(member.kind==="direct") {const peers=(await this.members(db,id)).filter(who=>who!==user);if(peers.length!==1)throw new ServiceError(403,"Conversation unavailable.");await this.connected(db,user,peers[0]);}
    return member;
  }
  async uploadChatImage(user:string,id:string,retryId:string,bytes:Uint8Array) {
    validId(retryId);
    const contentType=imageContentType(bytes);
    if(!contentType)throw new ServiceError(400,"Choose a JPEG, PNG, or WebP image smaller than 5 MB.");
    const storage=this.imageStorage;if(!storage)throw new ServiceError(503,"Photo sharing is temporarily unavailable.");
    const hash=createHash("sha256").update(bytes).digest("hex");
    return this.mutate(user,async db=>{
      await this.chatAccess(db,user,id);
      const {rows:[existing]}=await db.query("SELECT * FROM nimqulo_chat_images WHERE owner_id=$1 AND retry_id=$2",[user,retryId]);
      if(existing){if(existing.conversation_id!==id||existing.sha256!==hash)throw new ServiceError(409,"Upload identifier already used.");return {id:String(existing.id)};}
      const {rows:[count]}=await db.query("SELECT count(*)::int AS n FROM nimqulo_chat_images WHERE owner_id=$1 AND created_at>now()-interval '1 minute'",[user]);
      if(count.n>=30)throw new ServiceError(429,"Please wait before uploading more photos.");
      const imageId=randomUUID(),key=`messages/${id}/${user}/${imageId}`;
      await storage.upload(key,bytes,contentType);
      try{await db.query("INSERT INTO nimqulo_chat_images(id,conversation_id,owner_id,retry_id,object_key,content_type,size,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[imageId,id,user,retryId,key,contentType,bytes.length,hash]);}
      catch(error){await storage.delete(key).catch(()=>{});throw error;}
      return {id:imageId};
    });
  }
  async chatImage(user:string,id:string,imageId:string) {
    validId(imageId);
    const db=this.pool;
      const member=await this.chatAccess(db,user,id);
      const {rows:[image]}=await db.query(`SELECT i.object_key FROM nimqulo_chat_images i JOIN nimqulo_messages m ON m.image_id=i.id
        WHERE i.id=$1 AND i.conversation_id=$2 AND NOT m.deleted AND m.seq >= $3`,[imageId,id,member.start_seq]);
      if(!image)throw new ServiceError(404,"Photo unavailable.");
      if(!this.imageStorage)throw new ServiceError(503,"Photo sharing is temporarily unavailable.");
      return {url:await this.imageStorage.url(image.object_key)};
  }
  async send(user:string,id:string,text:string,retryId:string,replyToId?:string,imageId?:string) {
    if(imageId!==undefined){validId(imageId);if(typeof text!=="string"||text.includes("\u0000")||[...text].length>4000)throw new ServiceError(400,"Captions must be shorter than 4,001 characters.");}
    else validText(text);
    validId(retryId);
    if(replyToId!==undefined)validId(replyToId);
    return this.mutate(user,async db=>{
      const member=await this.chatAccess(db,user,id);
      const {rows:[existing]}=await db.query("SELECT * FROM nimqulo_messages WHERE author_id=$1 AND retry_id=$2",[user,retryId]);
      if(existing){if(existing.conversation_id!==id||(!existing.deleted&&(existing.body!==text||existing.reply_to_id!==(replyToId||null)||existing.image_id!==(imageId||null))))throw new ServiceError(409,"Retry identifier already used.");return this.messageRecord(db,existing.id,user);}
      if(imageId&&!(await db.query("SELECT 1 FROM nimqulo_chat_images i WHERE i.id=$1 AND i.conversation_id=$2 AND i.owner_id=$3 AND i.retry_id=$4 AND NOT EXISTS(SELECT 1 FROM nimqulo_messages m WHERE m.image_id=i.id)",[imageId,id,user,retryId])).rowCount)throw new ServiceError(403,"Choose your own photo for this conversation.");
      if(replyToId){const {rows:[original]}=await db.query("SELECT seq,deleted FROM nimqulo_messages WHERE id=$1 AND conversation_id=$2",[replyToId,id]);if(!original||original.deleted||Number(original.seq)<Number(member.start_seq))throw new ServiceError(403,"This message is no longer available to reply to.");}
      const {rows:[count]}=await db.query("SELECT count(*)::int AS n FROM nimqulo_messages WHERE author_id=$1 AND created_at>now()-interval '1 minute'",[user]);
      if(count.n>=30)throw new ServiceError(429,"Please wait before sending more messages.");
      const {rows:[conversation]}=await db.query("UPDATE nimqulo_conversations SET next_seq=next_seq+1 WHERE id=$1 RETURNING next_seq",[id]);
      const messageId=randomUUID();
      await db.query("INSERT INTO nimqulo_messages(id,conversation_id,author_id,retry_id,seq,body,reply_to_id,image_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[messageId,id,user,retryId,conversation.next_seq,text,replyToId||null,imageId||null]);
      for(const target of await this.members(db,id)) {
        await this.event(db,[target],target===user?"sent":"message",id,messageId);
      }
      return this.messageRecord(db,messageId,user);
    });
  }
  async messages(user:string,id:string,before?:number) {
    const m=await this.member(this.pool,user,id);
    if(before!==undefined&&(!Number.isSafeInteger(before)||before<1))throw new ServiceError(400,"Invalid message cursor.");
    const {rows}=await this.pool.query("SELECT id FROM nimqulo_messages WHERE conversation_id=$1 AND seq >= $2 AND ($3::bigint IS NULL OR seq < $3) ORDER BY seq DESC LIMIT 50",[id,m.start_seq,before||null]);
    const messages=await Promise.all(rows.reverse().map(r=>this.messageRecord(this.pool,r.id,user)));
    return {messages,before:messages.length===50?messages[0].seq:null};
  }
  async typingAudience(user:string,id:string){
    const member=await this.member(this.pool,user,id);
    if(member.kind==="direct"){const peers=(await this.members(this.pool,id)).filter(who=>who!==user);if(peers.length!==1)throw new ServiceError(403,"Conversation unavailable.");await this.connected(this.pool,user,peers[0]);}
    const {rows}=await this.pool.query("SELECT m.user_id FROM nimqulo_memberships m JOIN nimqulo_accounts a USING(user_id) WHERE m.conversation_id=$1 AND m.end_seq IS NULL AND m.user_id<>$2 AND a.approved AND a.status='active'",[id,user]);
    const {rows:[profile]}=await this.pool.query("SELECT display_name FROM nimqulo_profiles WHERE user_id=$1",[user]);
    return {recipients:rows.map(r=>String(r.user_id)),name:String(profile?.display_name||"Someone")};
  }
  async read(user:string,id:string,seq:number) {
    if(!Number.isSafeInteger(seq)||seq<0)throw new ServiceError(400,"Invalid read position.");
    return this.mutate(user,async db=>{const m=await this.member(db,user,id);const updated=await db.query("UPDATE nimqulo_memberships SET read_seq=least($2::bigint,$3::bigint) WHERE id=$1 AND read_seq<least($2::bigint,$3::bigint) RETURNING id",[m.id,seq,m.next_seq]);if(updated.rowCount)await this.event(db,await this.members(db,id),"read",id);});
  }
  async block(user:string,target:string,blocked:boolean) {
    return this.mutate(user,async db=>{
      if(user===target)throw new ServiceError(400,"You cannot block yourself.");
      if(blocked) {
        if(!(await db.query("SELECT 1 FROM nimqulo_accounts WHERE user_id=$1",[target])).rowCount)throw new ServiceError(404,"User unavailable.");
        await db.query("INSERT INTO nimqulo_blocks(owner_id,target_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[user,target]);
        const [low,high]=pair(user,target);
        await db.query("UPDATE nimqulo_connections SET status='cancelled',updated_at=now() WHERE low_id=$1 AND high_id=$2",[low,high]);
        await db.query("UPDATE nimqulo_invitations SET status='declined' WHERE status='pending' AND ((inviter_id=$1 AND recipient_id=$2) OR (inviter_id=$2 AND recipient_id=$1))",[user,target]);
      }else await db.query("DELETE FROM nimqulo_blocks WHERE owner_id=$1 AND target_id=$2",[user,target]);
      await this.event(db,[user,target],"block");
    });
  }
  async report(user:string,target:string,reason:string) {
    validText(reason,2000);
    return this.mutate(user,async db=>{
      if(user===target||!(await db.query("SELECT 1 FROM nimqulo_accounts WHERE user_id=$1",[target])).rowCount)throw new ServiceError(404,"User unavailable.");
      const id=randomUUID();await db.query("INSERT INTO nimqulo_reports(id,reporter_id,target_id,reason) VALUES($1,$2,$3,$4)",[id,user,target,reason.trim()]);return {id};
    });
  }
  async device(user:string,token:string|null) {
    if(token!==null&&(typeof token!=="string"||!/^ExponentPushToken\[[\w-]+\]$|^ExpoPushToken\[[\w-]+\]$/.test(token)))throw new ServiceError(400,"Invalid push token.");
    return this.mutate(user,async db=>{
      await db.query("UPDATE nimqulo_devices SET push_token=NULL WHERE push_token=$1 AND user_id<>$2",[token,user]);
      await db.query("UPDATE nimqulo_devices SET push_token=$2,updated_at=now() WHERE user_id=$1",[user,token]);
    });
  }
  async snapshot(user:string):Promise<Snapshot> {
    await this.account(this.pool,user);
    const {rows:rows}=await this.pool.query(`SELECT p.*,a.avatar_url,a.avatar_key,r.id AS connection_id,r.status,r.requester_id,
      EXISTS(SELECT 1 FROM nimqulo_blocks b WHERE b.owner_id=$1 AND b.target_id=p.user_id) AS blocked
      FROM nimqulo_profiles p JOIN nimqulo_accounts a USING(user_id)
      LEFT JOIN nimqulo_connections r ON r.low_id=least($1,p.user_id) AND r.high_id=greatest($1,p.user_id)
      WHERE p.user_id<>$1 AND a.status='active' AND a.approved AND
      (r.status IN ('accepted','pending') OR EXISTS(SELECT 1 FROM nimqulo_blocks b WHERE b.owner_id=$1 AND b.target_id=p.user_id)
      OR EXISTS(SELECT 1 FROM nimqulo_memberships x JOIN nimqulo_memberships y ON x.conversation_id=y.conversation_id WHERE x.user_id=$1 AND y.user_id=p.user_id AND x.end_seq IS NULL AND y.end_seq IS NULL))`,[user]);
    const people=await Promise.all(rows.map(r=>this.person({...r,connected:r.status==="accepted",requested:r.status==="pending"&&r.requester_id===user})));
    const requests=rows.filter(r=>r.status==="pending"&&!r.blocked).map(r=>({id:r.connection_id,person:people.find(p=>p.id===r.user_id)!,age:"Pending",direction:r.requester_id===user?"outgoing" as const:"incoming" as const}));
    const {rows:convs}=await this.pool.query(`SELECT c.*,m.read_seq,m.start_seq,m.role,
      p.display_name,p.username,peer.avatar_url,peer.avatar_key,other.user_id AS peer_id,
      last.body AS last_body,last.image_id AS last_image,last.deleted AS last_deleted,last.created_at AS last_at,
      (SELECT count(*)::int FROM nimqulo_messages msg WHERE msg.conversation_id=c.id AND msg.seq>greatest(m.read_seq,m.start_seq-1) AND msg.author_id<>$1) AS unread
      FROM nimqulo_conversations c JOIN nimqulo_memberships m ON m.conversation_id=c.id AND m.user_id=$1 AND m.end_seq IS NULL
      LEFT JOIN LATERAL(SELECT user_id FROM nimqulo_memberships WHERE conversation_id=c.id AND user_id<>$1 AND end_seq IS NULL LIMIT 1) other ON c.kind='direct'
      LEFT JOIN nimqulo_profiles p ON p.user_id=other.user_id
      LEFT JOIN nimqulo_accounts peer ON peer.user_id=other.user_id
      LEFT JOIN LATERAL(SELECT body,image_id,deleted,created_at FROM nimqulo_messages WHERE conversation_id=c.id AND seq>=m.start_seq ORDER BY seq DESC LIMIT 1) last ON true
      ORDER BY coalesce(last.created_at,c.created_at) DESC`,[user]);
    for(const conversation of convs)if(conversation.avatar_key&&this.imageStorage)conversation.avatar_url=await this.imageStorage.url(conversation.avatar_key);
    const groups:Snapshot["groups"]=[];
    for(const c of convs.filter(c=>c.kind==="group")) {
      const {rows:members}=await this.pool.query("SELECT p.*,a.avatar_url,a.avatar_key,m.role FROM nimqulo_memberships m LEFT JOIN nimqulo_profiles p USING(user_id) LEFT JOIN nimqulo_accounts a ON a.user_id=m.user_id WHERE m.conversation_id=$1 AND m.end_seq IS NULL ORDER BY m.joined_at,m.user_id",[c.id]);
      groups.push({id:c.id,name:c.name,added:true,myRole:c.role,members:await Promise.all(members.map(async r=>({person:await this.person(r),role:r.role})))});
    }
    const {rows:invitations}=await this.pool.query("SELECT i.id,c.name,p.display_name AS invited_by,i.status FROM nimqulo_invitations i JOIN nimqulo_conversations c ON c.id=i.conversation_id LEFT JOIN nimqulo_profiles p ON p.user_id=i.inviter_id WHERE i.recipient_id=$1 ORDER BY i.created_at DESC LIMIT 100",[user]);
    return {people,requests,groups,invitations:invitations.map(r=>({id:r.id,name:r.name,invitedBy:r.invited_by||"Deleted account",status:r.status})),blocked:people.filter(p=>p.blocked),
      conversations:convs.map(c=>({id:c.id,kind:c.kind,title:c.kind==="group"?c.name:c.display_name||"Deleted account",username:c.username||undefined,peerId:c.peer_id||undefined,...(c.avatar_url?{avatar:{uri:c.avatar_url}}:{}),message:c.last_deleted?"Message deleted":c.last_body||(c.last_image?"Photo":"No messages yet"),unread:c.unread,updatedAt:new Date(c.last_at||c.created_at).toISOString(),nextSeq:Number(c.next_seq)})),operator:this.operators.includes(user)};
  }
  async operator(user:string) {await this.account(this.pool,user);if(!this.operators.includes(user))throw new ServiceError(403,"Operator access required.");}
  async reports(user:string) {await this.operator(user);return (await this.pool.query("SELECT r.id,r.reporter_id,r.target_id,r.reason,r.status,r.created_at,p.display_name AS target_name FROM nimqulo_reports r LEFT JOIN nimqulo_profiles p ON p.user_id=r.target_id ORDER BY r.created_at DESC LIMIT 100")).rows;}
  async moderate(user:string,reportId:string,status:"reviewed"|"dismissed",suspend:boolean) {
    await this.operator(user);validId(reportId);
    return this.mutate(user,async db=>{
      const {rows:[r]}=await db.query("UPDATE nimqulo_reports SET status=$2 WHERE id=$1 RETURNING target_id",[reportId,status]);
      if(!r)throw new ServiceError(404,"Report unavailable.");
      if(suspend){if(this.operators.includes(r.target_id))throw new ServiceError(403,"An operator account cannot be suspended here.");await db.query("UPDATE nimqulo_accounts SET status='suspended' WHERE user_id=$1",[r.target_id]);await db.query("UPDATE nimqulo_devices SET push_token=NULL WHERE user_id=$1",[r.target_id]);await this.event(db,[r.target_id],"session");}
    });
  }
  async deleteAccount(user:string) {
    return this.mutate(user,async db=>{
      await db.query("UPDATE nimqulo_accounts SET status='deleting',approved=false WHERE user_id=$1",[user]);
      await db.query("UPDATE nimqulo_devices SET push_token=NULL WHERE user_id=$1",[user]);
      await db.query("INSERT INTO nimqulo_deletions(user_id) VALUES($1) ON CONFLICT DO NOTHING",[user]);
      await this.event(db,[user],"session");
    });
  }
  async cleanAccount(user:string) {
    return this.transaction(async db=>{
      const {rows:[account]}=await db.query("SELECT status FROM nimqulo_accounts WHERE user_id=$1",[user]);
      if(!account||account.status!=="deleting")throw new ServiceError(409,"Deletion not requested.");
      const {rows:memberships}=await db.query("SELECT * FROM nimqulo_memberships WHERE user_id=$1 AND end_seq IS NULL ORDER BY conversation_id",[user]);
      for(const m of memberships) {
        const {rows:[c]}=await db.query("SELECT * FROM nimqulo_conversations WHERE id=$1 FOR UPDATE",[m.conversation_id]);
        await db.query("UPDATE nimqulo_memberships SET end_seq=$2 WHERE id=$1",[m.id,c.next_seq]);
        if(m.role==="Owner") {
          const {rows:[successor]}=await db.query(`SELECT m.id FROM nimqulo_memberships m JOIN nimqulo_accounts a USING(user_id) WHERE m.conversation_id=$1 AND m.end_seq IS NULL AND a.status='active'
            ORDER BY CASE m.role WHEN 'Admin' THEN 0 ELSE 1 END,m.joined_at,m.user_id LIMIT 1`,[c.id]);
          if(successor)await db.query("UPDATE nimqulo_memberships SET role='Owner' WHERE id=$1",[successor.id]);
        }
        await this.event(db,await this.members(db,c.id),"deletion",c.id);
      }
      await db.query("UPDATE nimqulo_messages SET body=NULL,deleted=true WHERE author_id=$1",[user]);
      // No free-text evidence is retained when either subject deletes their account.
      await db.query("DELETE FROM nimqulo_reports WHERE reporter_id=$1 OR target_id=$1",[user]);
      await db.query("UPDATE nimqulo_connections SET status='cancelled' WHERE $1 IN(low_id,high_id)",[user]);
      await db.query("UPDATE nimqulo_invitations SET status='declined' WHERE (inviter_id=$1 OR recipient_id=$1) AND status='pending'",[user]);
      await db.query("DELETE FROM nimqulo_blocks WHERE owner_id=$1 OR target_id=$1",[user]);
      await db.query("DELETE FROM nimqulo_preferences WHERE user_id=$1",[user]);
      await db.query("DELETE FROM nimqulo_profiles WHERE user_id=$1",[user]);
      await db.query("DELETE FROM nimqulo_devices WHERE user_id=$1",[user]);
      await db.query("UPDATE nimqulo_accounts SET avatar_url=NULL,avatar_key=NULL WHERE user_id=$1",[user]);
      await db.query("DELETE FROM nimqulo_events WHERE user_id=$1",[user]);
    });
  }
}
