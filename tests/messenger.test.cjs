const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");

test("messenger transactions enforce authorization and lifecycle rules on Postgres", { skip: !process.env.MESSENGER_TEST_DATABASE_URL, timeout: 600000 }, async t => {
  const url = new URL(process.env.MESSENGER_TEST_DATABASE_URL);
  assert.equal(url.hostname, process.env.MESSENGER_TEST_HOST, "isolated host must match explicitly");
  const { MessengerStore } = await import("../backend/messenger-store.ts");
  const schema = `qa_messenger_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: url.href, max: 1 });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url.href, max: 5, connectionTimeoutMillis: 15000, options: `-c search_path=${schema}` });
  const fs = require("node:fs");
  for (const file of fs.readdirSync("backend/migrations").filter(f=>f.endsWith(".sql")).sort()) await pool.query(fs.readFileSync(`backend/migrations/${file}`,"utf8"));
  const prefix = `qa_${randomUUID().replaceAll("-", "").slice(0,8)}`;
  const users = Array.from({ length: 23 }, (_, i) => `${prefix}_${i}`);
  const [alice,bob,eve] = users;
  const store = new MessengerStore(pool, [alice]);
  async function connect(a,b) {
    await store.requestConnection(a,b);
    const request = (await store.snapshot(b)).requests.find(r=>r.person.id===a);
    await store.decideConnection(b,request.id,"accept");
  }
  try {
    for (let i=0;i<users.length;i++) {
      await pool.query("INSERT INTO nimqulo_accounts(user_id,approved) VALUES($1,true)",[users[i]]);
      await pool.query("INSERT INTO nimqulo_profiles(user_id,display_name,username) VALUES($1,$2,$3)",[users[i],`QA Person ${i}`,`${prefix}_${i}`]);
    }
    await t.test("unaccepted connections cannot message, and concurrent requests stay unique",async()=>{
      await assert.rejects(store.direct(alice,bob),{status:403});
      const requests=await Promise.allSettled([store.requestConnection(alice,bob),store.requestConnection(bob,alice)]);
      assert.equal(requests.filter(r=>r.status==="fulfilled").length,1);
      const {rows:[r]}=await pool.query("SELECT * FROM nimqulo_connections WHERE low_id=least($1,$2) AND high_id=greatest($1,$2)",[alice,bob]);
      const recipient=r.requester_id===alice?bob:alice;
      await assert.rejects(store.decideConnection(r.requester_id,r.id,"accept"),{status:403});
      await store.decideConnection(recipient,r.id,"accept");
      const conversations=await Promise.all([store.direct(alice,bob),store.direct(bob,alice)]);
      assert.equal(conversations[0].id,conversations[1].id);
    });
    const direct=(await store.direct(alice,bob)).id;
    await t.test("concurrent retries commit exactly one message and validate content",async()=>{
      const retry=randomUUID();
      const sent=await Promise.all([store.send(alice,direct,"Hello नमस्ते 👋",retry),store.send(alice,direct,"Hello नमस्ते 👋",retry)]);
      assert.equal(sent[0].id,sent[1].id);
      assert.equal((await store.messages(bob,direct)).messages.length,1);
      await assert.rejects(store.send(alice,direct,"Changed",retry),{status:409});
      await assert.rejects(store.send(alice,direct,"  ",randomUUID()),{status:400});
      await assert.rejects(store.send(alice,direct,"x".repeat(4001),randomUUID()),{status:400});
      await assert.rejects(store.messages(eve,direct),{status:403});
      assert.ok((await pool.query("SELECT id FROM nimqulo_events WHERE message_id=$1",[sent[0].id])).rowCount>=2,"outbox committed with message");
    });
    await t.test("replies persist safely and receipts advance monotonically without notification pushes",async()=>{
      const original=(await store.messages(bob,direct)).messages[0];
      assert.equal(original.readBy,0);assert.equal(original.recipientCount,1);
      const retry=randomUUID();const reply=await store.send(bob,direct,"A quoted reply",retry,original.id);
      assert.equal(reply.reply.id,original.id);assert.equal(reply.reply.text,original.text);
      assert.equal((await store.send(bob,direct,"A quoted reply",retry,original.id)).id,reply.id);
      await assert.rejects(store.send(bob,direct,"A quoted reply",retry),{status:409});
      const other=(await store.saveGroup(alice,"Reply isolation",[])).id;
      const secret=await store.send(alice,other,"Other conversation",randomUUID());
      await assert.rejects(store.send(bob,direct,"Cross-chat reply",randomUUID(),secret.id),{status:403});
      await assert.rejects(store.send(bob,direct,"Invalid reply",randomUUID(),"bad-id"),{status:400});
      await store.read(bob,direct,original.seq);
      assert.equal((await store.messages(alice,direct)).messages.find(m=>m.id===original.id).readBy,1);
      const count=Number((await pool.query("SELECT count(*) FROM nimqulo_events WHERE conversation_id=$1 AND kind='read'",[direct])).rows[0].count);
      await store.read(bob,direct,0);await store.read(bob,direct,original.seq);
      assert.equal(Number((await pool.query("SELECT count(*) FROM nimqulo_events WHERE conversation_id=$1 AND kind='read'",[direct])).rows[0].count),count);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM nimqulo_events WHERE kind='read' AND NOT push_done")).rows[0].n,0);
      await pool.query("UPDATE nimqulo_messages SET deleted=true,body=NULL WHERE id=$1",[original.id]);
      const hidden=(await store.messages(alice,direct)).messages.find(m=>m.id===reply.id).reply;
      assert.equal(hidden.unavailable,true);assert.equal(hidden.text,"Original message unavailable");
      await assert.rejects(store.send(bob,direct,"Deleted reply",randomUUID(),original.id),{status:403});
    });
    await t.test("blocking prevents requests and direct delivery in both directions",async()=>{
      await store.block(bob,alice,true);
      await assert.rejects(store.typingAudience(alice,direct),{status:403});
      await assert.rejects(store.send(alice,direct,"blocked",randomUUID()),{status:403});
      await assert.rejects(store.send(bob,direct,"blocked",randomUUID()),{status:403});
      await assert.rejects(store.requestConnection(alice,bob),{status:403});
      await assert.rejects(store.requestConnection(bob,alice),{status:403});
      assert.equal((await store.lookup(alice,`${prefix}_1`)).length,0);
      await store.block(bob,alice,false);await connect(alice,bob);
    });
    await connect(alice,eve);
    const group=(await store.saveGroup(alice,"QA Group",[bob,eve])).id;
    await t.test("invitations require acceptance and concurrent decisions are atomic",async()=>{
      await assert.rejects(store.messages(bob,group),{status:403});
      await assert.rejects(store.typingAudience(bob,group),{status:403});
      const invitation=(await store.snapshot(bob)).invitations.find(i=>i.name==="QA Group");
      const results=await Promise.allSettled([store.decideInvitation(bob,invitation.id,"accepted"),store.decideInvitation(bob,invitation.id,"accepted")]);
      assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
      assert.equal((await store.snapshot(bob)).groups.find(g=>g.id===group).members.length,2);
    });
    await t.test("history is restricted to the current membership period",async()=>{
      await store.send(alice,group,"Before joining",randomUUID());
      const invitation=(await store.snapshot(eve)).invitations.find(i=>i.name==="QA Group");
      await store.decideInvitation(eve,invitation.id,"accepted");
      assert.equal((await store.messages(eve,group)).messages.length,0);
      const earlier=(await store.messages(alice,group)).messages.at(-1);
      await assert.rejects(store.send(eve,group,"Reply before joining",randomUUID(),earlier.id),{status:403});
      const quoted=await store.send(bob,group,"After joining",randomUUID(),earlier.id);
      const visible=await store.messages(eve,group);
      assert.equal(visible.messages.length,1);assert.equal(visible.messages[0].reply.unavailable,true);
      assert.equal(visible.messages[0].reply.text,"Original message unavailable");
      await store.read(eve,group,quoted.seq);
      assert.equal((await store.messages(alice,group)).messages.find(m=>m.id===earlier.id).readBy,0,"a later joiner is not an original recipient");
      assert.equal((await store.messages(alice,group)).messages.find(m=>m.id===quoted.id).readBy,1);
      await store.manageMember(alice,group,eve,"remove");
      await assert.rejects(store.messages(eve,group),{status:403});
      await store.saveGroup(alice,"QA Group",[eve],group);
      const second=(await store.snapshot(eve)).invitations.find(i=>i.status==="pending"&&i.name==="QA Group");
      await store.decideInvitation(eve,second.id,"accepted");
      assert.equal((await store.messages(eve,group)).messages.length,0);
    });
    await t.test("roles, ownership transfer, and owner exit are authorized",async()=>{
      await assert.rejects(store.manageMember(eve,group,bob,"Admin"),{status:403});
      await assert.rejects(store.manageMember(alice,group,alice,"leave"),{status:409});
      await store.manageMember(alice,group,bob,"Admin");
      await assert.rejects(store.manageMember(bob,group,alice,"remove"),{status:403});
      await store.manageMember(alice,group,bob,"transfer");
      assert.equal((await store.snapshot(bob)).groups.find(g=>g.id===group).myRole,"Owner");
      await store.manageMember(bob,group,alice,"transfer");
    });
    await t.test("group capacity holds under simultaneous invitation acceptance",async()=>{
      await pool.query(`INSERT INTO nimqulo_connections(id,low_id,high_id,requester_id,status)
        SELECT gen_random_uuid(),least($1,u),greatest($1,u),$1,'accepted' FROM unnest($2::text[]) u ON CONFLICT DO NOTHING`,[alice,users.slice(3,22)]);
      const capacity=(await store.saveGroup(alice,"Capacity",[users[19],users[20]])).id;
      await pool.query("INSERT INTO nimqulo_memberships(id,conversation_id,user_id,role,start_seq) SELECT gen_random_uuid(),$1,u,'Member',1 FROM unnest($2::text[]) u",[capacity,users.slice(1,19)]);
      const a=(await store.snapshot(users[19])).invitations.find(i=>i.name==="Capacity");
      const b=(await store.snapshot(users[20])).invitations.find(i=>i.name==="Capacity");
      const results=await Promise.allSettled([store.decideInvitation(users[19],a.id,"accepted"),store.decideInvitation(users[20],b.id,"accepted")]);
      assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
      assert.equal((await store.snapshot(alice)).groups.find(g=>g.id===capacity).members.length,20);
    });
    await t.test("active phone replacement rejects older sessions",async()=>{
      const first={id:alice,approved:true,sessionId:"qa_old",sessionStarted:100};
      const second={...first,sessionId:"qa_new",sessionStarted:200};
      const device=randomUUID();
      await assert.rejects(store.authorize(first,device),{code:"PILOT_FULL"});
      await pool.query("UPDATE nimqulo_accounts SET approved=false WHERE user_id=ANY($1::text[])",[users.slice(20)]);
      await store.authorize(first,device);await store.authorize(second,randomUUID());
      await assert.rejects(store.authorize(first),{status:409,code:"SESSION_REPLACED"});
      await assert.rejects(store.authorize(first,device),{status:409});
      await store.authorize(second);
      await store.session.run(first,()=>assert.rejects(store.send(alice,direct,"stale session",randomUUID()),{code:"SESSION_REPLACED"}));
    });
    await t.test("HTTP routes enforce sessions, membership, operator permissions, and validation",async()=>{
      const {createApp}=await import("../backend/app.ts");
      const identity={id:bob,approved:true,sessionId:"qa_http",sessionStarted:400};
      const typing=[];
      const app=createApp({messenger:store,publishTyping:async(recipients,activity)=>{typing.push({recipients,activity});},authenticate:async token=>{if(token!=="qa-token")throw Error("forged");return identity;}},[]);
      const request=(path,method="GET",body,token="qa-token")=>app.request(path,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},...(body!==undefined?{body:JSON.stringify(body)}:{})});
      assert.equal((await request("/community","GET",undefined,"forged")).status,401);
      assert.equal((await request("/session/activate","POST",{})).status,400);
      assert.equal((await request("/session/activate","POST",{deviceId:randomUUID()})).status,200);
      assert.equal((await request("/moderation/reports")).status,403);
      assert.equal((await request("/community")).status,200);
      const eventCount=(await pool.query("SELECT count(*) FROM nimqulo_events")).rows[0].count;
      assert.equal((await request(`/conversations/${direct}/typing`,"POST",{typing:true,userId:alice,name:"forged name",text:"private draft"})).status,204);
      assert.deepEqual(typing[0].recipients,[alice]);assert.equal(typing[0].activity.userId,bob);assert.equal(typing[0].activity.name,"QA Person 1");assert.equal(typing[0].activity.text,undefined);
      assert.equal((await request(`/conversations/${direct}/typing`,"POST",{typing:false})).status,204);assert.equal(typing[1].activity.typing,false);
      assert.equal((await request(`/conversations/${direct}/typing`,"POST",{typing:"yes"})).status,400);
      assert.equal((await request(`/conversations/${randomUUID()}/typing`,"POST",{typing:true})).status,403);
      assert.equal((await pool.query("SELECT count(*) FROM nimqulo_events")).rows[0].count,eventCount,"typing must not create durable delivery/push jobs");
      assert.equal((await request(`/conversations/${direct}/messages`)).status,200);
      assert.equal((await request(`/groups/${group}/members`,"POST",{targetId:alice,action:"transfer"})).status,403);
      assert.equal((await request("/groups","POST",{name:"Missing invitees"})).status,400);
      assert.equal((await request("/groups","POST",{name:"x".repeat(25000),invitees:[]})).status,413);
      assert.equal((await app.request("/internal/realtime",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})).status,401);
      assert.equal((await app.request("/internal/sweep",{method:"POST",body:"{}"})).status,401);
    });
    await t.test("reports are operator-only and suspension blocks mutations",async()=>{
      const report=await store.report(bob,eve,"QA safety report");
      await assert.rejects(store.reports(bob),{status:403});
      assert.ok((await store.reports(alice)).some(r=>r.id===report.id));
      await store.moderate(alice,report.id,"reviewed",true);
      await assert.rejects(store.send(eve,group,"suspended",randomUUID()),{status:403,code:"SUSPENDED"});
      await store.session.run({id:alice,sessionId:"qa_new"},()=>assert.rejects(store.direct(alice,eve),{status:403,code:"PERSON_UNAVAILABLE"}));
    });
    await t.test("deletion wipes authored text and promotes the longest-serving admin",async()=>{
      await store.manageMember(alice,group,bob,"Admin");
      await store.deleteAccount(alice);
      await assert.rejects(store.direct(alice,bob),{status:403});
      await store.cleanAccount(alice);await store.cleanAccount(alice);
      const {rows}=await pool.query("SELECT body,deleted FROM nimqulo_messages WHERE author_id=$1",[alice]);
      assert.ok(rows.length);assert.ok(rows.every(m=>m.deleted&&m.body===null));
      assert.equal((await pool.query("SELECT 1 FROM nimqulo_profiles WHERE user_id=$1",[alice])).rowCount,0);
      assert.equal((await store.snapshot(bob)).groups.find(g=>g.id===group).myRole,"Owner");
      assert.ok((await store.messages(bob,direct)).messages.some(m=>m.text==="Message deleted"));
    });
    await t.test("committed messages survive realtime/push outages and durable recovery retries",async()=>{
      const {createDelivery}=await import("../backend/delivery.ts");
      await store.authorize({id:bob,approved:true,sessionId:"qa_bob",sessionStarted:500},randomUUID());
      await store.device(bob,"ExpoPushToken[qa-device]");
      const capacity=(await store.snapshot(bob)).groups.find(g=>g.name==="Capacity").id;
      const message=await store.send(users[3],capacity,"Private persisted text",randomUUID());
      // Isolate this event from the other synthetic test events and deletion jobs.
      await pool.query("UPDATE nimqulo_events SET realtime_done=true,push_done=true WHERE message_id IS DISTINCT FROM $1 OR user_id<>$2",[message.id,bob]);
      await pool.query("UPDATE nimqulo_deletions SET available_at=now()+interval '1 day'");
      let fail=true,pushCalls=0;
      const original=global.fetch;
      global.fetch=async(url,init)=>{
        if(String(url).includes("api.clerk.com/v1/users/"))return Response.json({public_metadata:{approved:true},primary_email_address_id:"email",email_addresses:[{id:"email",email_address:"qa@example.com",verification:{status:"verified"}}],external_accounts:[{provider:"oauth_google",email_address:"qa@example.com"}]});
        if(String(url).includes("api.clerk.com/v1/sessions/"))return Response.json({status:"active"});
        if(String(url).includes("realtime.example"))return new Response("",{status:fail?503:200});
        if(String(url).includes("push/send")){pushCalls++;const body=JSON.parse(init.body);assert.equal(body.body,"You have a new message");return fail?new Response("",{status:503}):Response.json({data:{id:"qa_ticket",status:"ok"}});}
        if(String(url).includes("getReceipts"))return Response.json({data:{qa_ticket:{status:"error",details:{error:"DeviceNotRegistered"}}}});
        throw Error("Unexpected service call");
      };
      try{
        const sweep=createDelivery(store,{realtimeUrl:"https://realtime.example",serviceKey:"qa-key",clerkSecret:"qa-key",deleteObject:async()=>{}});
        await sweep();assert.equal(pushCalls,1,"push is attempted even when realtime fails");
        assert.ok((await store.messages(bob,capacity)).messages.some(m=>m.id===message.id));
        const reset=()=>pool.query("UPDATE nimqulo_events SET available_at=now() WHERE message_id=$1 AND user_id=$2",[message.id,bob]);
        fail=false;await reset();await sweep();assert.equal(pushCalls,2);
        await reset();await sweep();
        assert.equal((await pool.query("SELECT push_token FROM nimqulo_devices WHERE user_id=$1",[bob])).rows[0].push_token,null);
        const event=(await pool.query("SELECT realtime_done,push_done FROM nimqulo_events WHERE message_id=$1 AND user_id=$2",[message.id,bob])).rows[0];
        assert.equal(event.realtime_done,true);assert.equal(event.push_done,true);
      }finally{global.fetch=original;}
    });
  } finally {await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
