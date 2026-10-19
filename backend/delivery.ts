import type { MessengerStore } from "./messenger-store.ts";

type DeliveryOptions = { realtimeUrl?: string; serviceKey?: string; identity:{active:(user:string,session:string)=>Promise<boolean>;deleteUser:(user:string)=>Promise<void>}; deleteObject: (key:string)=>Promise<void> };
export function createDelivery(store:MessengerStore, options:DeliveryOptions) {
  let running:Promise<void>|undefined;
  async function sweep() {
    // Durable leases protect work across concurrent isolates and recover after crashes.
    const {rows:events}=await store.pool.query(`UPDATE nimqulo_events SET available_at=now()+interval '2 minutes',attempts=attempts+1
      WHERE id IN (SELECT id FROM nimqulo_events WHERE (NOT realtime_done OR NOT push_done) AND available_at<=now() ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 50) RETURNING *`);
    for(const event of events) {
      try {
        if(!event.realtime_done&&options.realtimeUrl&&options.serviceKey) {
          try {
          const response=await fetch(new URL("/dispatch",options.realtimeUrl),{method:"POST",headers:{"Content-Type":"application/json","X-Service-Key":options.serviceKey},body:JSON.stringify({userId:event.user_id,kind:event.kind,conversationId:event.conversation_id}),signal:AbortSignal.timeout(10000),redirect:"error"});
          if(!response.ok)throw new Error("Realtime dispatch rejected");
          await store.pool.query("UPDATE nimqulo_events SET realtime_done=true WHERE id=$1",[event.id]);
          } catch {console.error(JSON.stringify({event:"realtime_dispatch_failed",eventId:String(event.id)}));}
        } else if(!event.realtime_done) {
          await store.pool.query("UPDATE nimqulo_events SET realtime_done=true WHERE id=$1",[event.id]);
        }
        if(!event.push_done) {
          const {rows:[target]}=await store.pool.query(`SELECT d.push_token,d.session_id,p.notifications,p.previews,a.status,a.approved,m.body,m.image_id,m.deleted,
            sender.display_name,c.kind,c.name FROM nimqulo_devices d JOIN nimqulo_accounts a USING(user_id)
            LEFT JOIN nimqulo_preferences p USING(user_id)
            LEFT JOIN nimqulo_messages m ON m.id=$2 LEFT JOIN nimqulo_profiles sender ON sender.user_id=m.author_id
            LEFT JOIN nimqulo_conversations c ON c.id=m.conversation_id
            WHERE d.user_id=$1 AND NOT d.revoked AND (m.id IS NULL OR EXISTS(SELECT 1 FROM nimqulo_memberships membership WHERE membership.conversation_id=m.conversation_id AND membership.user_id=d.user_id AND membership.end_seq IS NULL AND m.seq>=membership.start_seq))
            AND (c.kind<>'direct' OR (EXISTS(SELECT 1 FROM nimqulo_connections rel WHERE rel.low_id=least(d.user_id,m.author_id) AND rel.high_id=greatest(d.user_id,m.author_id) AND rel.status='accepted')
            AND NOT EXISTS(SELECT 1 FROM nimqulo_blocks b WHERE (b.owner_id=d.user_id AND b.target_id=m.author_id) OR (b.target_id=d.user_id AND b.owner_id=m.author_id))))`,[event.user_id,event.message_id]);
          if(!target?.push_token||target.notifications===false||target.status!=="active"||!target.approved||target.deleted) {
            await store.pool.query("UPDATE nimqulo_events SET push_done=true WHERE id=$1",[event.id]);continue;
          }
          if(event.push_ticket) {
            const response=await fetch("https://exp.host/--/api/v2/push/getReceipts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:[event.push_ticket]}),signal:AbortSignal.timeout(10000)});
            if(!response.ok)throw new Error("Push receipt service unavailable");
            const body=await response.json() as {data?:Record<string,{status:string;details?:{error?:string}}>};
            const receipt=body.data?.[event.push_ticket];
            if(!receipt) {await store.pool.query("UPDATE nimqulo_events SET available_at=now()+interval '15 minutes' WHERE id=$1",[event.id]);continue;}
            if(receipt.details?.error==="DeviceNotRegistered")await store.pool.query("UPDATE nimqulo_devices SET push_token=NULL WHERE user_id=$1 AND push_token=$2",[event.user_id,target.push_token]);
            if(receipt.status!=="ok"&&receipt.details?.error!=="DeviceNotRegistered"){await store.pool.query("UPDATE nimqulo_events SET push_ticket=NULL WHERE id=$1",[event.id]);throw new Error("Push delivery failed");}
            await store.pool.query("UPDATE nimqulo_events SET push_done=true WHERE id=$1",[event.id]);
          } else {
            const active=await options.identity.active(event.user_id,target.session_id);
            if(!active){await store.pool.query("UPDATE nimqulo_devices SET push_token=NULL WHERE user_id=$1 AND session_id=$2",[event.user_id,target.session_id]);await store.pool.query("UPDATE nimqulo_events SET push_done=true WHERE id=$1",[event.id]);continue;}
            const response=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:target.push_token,title:target.previews?target.display_name||"Nimqulo":"Nimqulo",body:target.previews?String(target.body||(target.image_id?"Photo":"New message")).slice(0,120):"You have a new message",channelId:"messages",sound:"default",data:{conversationId:event.conversation_id,kind:target.kind}}),signal:AbortSignal.timeout(10000)});
            if(!response.ok)throw new Error("Push service unavailable");
            const body=await response.json() as {data?:{id?:string;status:string;details?:{error?:string}}};
            if(body.data?.details?.error==="DeviceNotRegistered") {await store.pool.query("UPDATE nimqulo_devices SET push_token=NULL WHERE user_id=$1 AND push_token=$2",[event.user_id,target.push_token]);await store.pool.query("UPDATE nimqulo_events SET push_done=true WHERE id=$1",[event.id]);}
            else if(body.data?.id)await store.pool.query("UPDATE nimqulo_events SET push_ticket=$2,available_at=now()+interval '15 minutes' WHERE id=$1",[event.id,body.data.id]);
            else throw new Error("Push ticket unavailable");
          }
        }
        await store.pool.query("UPDATE nimqulo_events SET available_at=now()+make_interval(secs=>least(900, power(2,least(attempts,9))::int)) WHERE id=$1 AND push_ticket IS NULL",[event.id]);
      }catch {console.error(JSON.stringify({event:"delivery_failed",eventId:String(event.id),attempt:event.attempts}));await store.pool.query("UPDATE nimqulo_events SET available_at=now()+make_interval(secs=>least(900,power(2,least(attempts,9))::int)) WHERE id=$1",[event.id]);}
    }
    const {rows:deletions}=await store.pool.query(`UPDATE nimqulo_deletions SET available_at=now()+interval '5 minutes',attempts=attempts+1
      WHERE user_id IN(SELECT user_id FROM nimqulo_deletions WHERE completed_at IS NULL AND available_at<=now() FOR UPDATE SKIP LOCKED LIMIT 5) RETURNING user_id`);
    for(const job of deletions) {
      try {
        await store.cleanAccount(job.user_id);
        for(const image of (await store.pool.query("SELECT id,object_key FROM nimqulo_chat_images WHERE owner_id=$1",[job.user_id])).rows){await options.deleteObject(image.object_key);await store.pool.query("DELETE FROM nimqulo_chat_images WHERE id=$1",[image.id]);}
        for(const image of (await store.pool.query("SELECT id,object_key FROM nimqulo_media WHERE owner_id=$1",[job.user_id])).rows) {await options.deleteObject(image.object_key);await store.pool.query("DELETE FROM nimqulo_media WHERE id=$1",[image.id]);}
        await options.identity.deleteUser(job.user_id);
        await store.transaction(async db=>{await db.query("UPDATE nimqulo_accounts SET status='deleted',approved=false WHERE user_id=$1",[job.user_id]);await db.query("UPDATE nimqulo_deletions SET completed_at=now() WHERE user_id=$1",[job.user_id]);});
      }catch {console.error(JSON.stringify({event:"account_cleanup_failed"}));}
    }
    // Abandoned uploads and deleted-message photos no longer need storage. The
    // shared mutation lock keeps cleanup from racing a send/retry transaction.
    await store.transaction(async db=>{
      const {rows:unused}=await db.query(`SELECT i.id,i.object_key FROM nimqulo_chat_images i
        WHERE i.created_at<now()-interval '24 hours' AND NOT EXISTS(SELECT 1 FROM nimqulo_messages m WHERE m.image_id=i.id AND NOT m.deleted) LIMIT 20`);
      for(const image of unused){await options.deleteObject(image.object_key);await db.query("DELETE FROM nimqulo_chat_images WHERE id=$1",[image.id]);}
    });
    await store.pool.query("DELETE FROM nimqulo_socket_tickets WHERE expires_at<now()");
    await store.pool.query("DELETE FROM nimqulo_rate_limits WHERE bucket<floor(extract(epoch from now())/60)-2");
    await store.pool.query("DELETE FROM nimqulo_events WHERE realtime_done AND push_done AND created_at<now()-interval '7 days'");
  }
  return () => running ||= sweep().finally(()=>{running=undefined;});
}
