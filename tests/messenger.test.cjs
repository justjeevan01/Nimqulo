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
  for (const file of fs.readdirSync("backend/migrations").filter(f=>f.endsWith(".sql")).sort()) {
    if(file==="006_socket_tickets.sql")assert.equal((await pool.query("SELECT to_regclass('nimqulo_socket_tickets') AS name")).rows[0].name,null,"the new migration repairs databases that already applied 003 without tickets");
    await pool.query(fs.readFileSync(`backend/migrations/${file}`,"utf8"));
  }
  const prefix = `qa_${randomUUID().replaceAll("-", "").slice(0,8)}`;
  const users = Array.from({ length: 23 }, (_, i) => `${prefix}_${i}`);
  const [alice,bob,eve] = users;
  const objects=new Map();
  const store = new MessengerStore(pool, [alice],{
    upload:async(key,bytes)=>{objects.set(key,Buffer.from(bytes));},
    url:async key=>{assert.ok(objects.has(key));return `https://private.test/${key}`;},
    delete:async key=>{objects.delete(key);},
  });
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
    await t.test("username autocomplete matches literal prefixes and preserves privacy and ranking",async()=>{
      assert.equal((await store.lookup(alice,prefix)).length,20,"suggestions are bounded");
      const names=["anna","annabelle","joanna","jo_ann","jozann","anna_pending","anna_suspended","anna_deleted"];
      const ids=names.map((_,i)=>`${prefix}_search_${i}`);
      try{
        for(let i=0;i<ids.length;i++){
          await pool.query("INSERT INTO nimqulo_accounts(user_id,approved,status) VALUES($1,$2,$3)",[ids[i],i!==5,i===6?"suspended":i===7?"deleted":"active"]);
          await pool.query("INSERT INTO nimqulo_profiles(user_id,display_name,username) VALUES($1,'Search QA',$2)",[ids[i],names[i]]);
        }
        assert.deepEqual((await store.lookup(alice," @ANNA ")).map(p=>p.username),["anna","annabelle"]);
        assert.deepEqual(await store.lookup(alice,"oann"),[],"middle substrings do not match");
        assert.deepEqual((await store.lookup(alice,"jo_")).map(p=>p.username),["jo_ann"],"underscore is a literal character");
        assert.ok((await store.lookup(alice,"j")).some(p=>p.id===ids[2]),"one character starts search");
        assert.ok(!(await store.lookup(ids[0],"anna")).some(p=>p.id===ids[0]),"self is excluded");
        for(const [owner,target] of [[alice,ids[1]],[ids[1],alice]]){
          await pool.query("INSERT INTO nimqulo_blocks(owner_id,target_id) VALUES($1,$2)",[owner,target]);
          assert.deepEqual((await store.lookup(alice,"anna")).map(p=>p.username),["anna"]);
          await pool.query("DELETE FROM nimqulo_blocks WHERE owner_id=$1 AND target_id=$2",[owner,target]);
        }
        for(const query of ["","%","a-b","a".repeat(25)])assert.deepEqual(await store.lookup(alice,query),[]);
      }finally{
        await pool.query("DELETE FROM nimqulo_blocks WHERE owner_id=ANY($1::text[]) OR target_id=ANY($1::text[])",[ids]);
        await pool.query("DELETE FROM nimqulo_profiles WHERE user_id=ANY($1::text[])",[ids]);
        await pool.query("DELETE FROM nimqulo_accounts WHERE user_id=ANY($1::text[])",[ids]);
      }
    });
    await t.test("socket ticket migration preserves existing tables and records when reapplied",async()=>{
      await pool.query("INSERT INTO nimqulo_socket_tickets(hash,user_id,session_id,expires_at) VALUES('qa-existing',$1,'qa-session',now()+interval '30 seconds')",[alice]);
      await pool.query(fs.readFileSync("backend/migrations/006_socket_tickets.sql","utf8"));
      assert.equal((await pool.query("SELECT user_id,session_id FROM nimqulo_socket_tickets WHERE hash='qa-existing'")).rows[0].user_id,alice);
      await assert.rejects(pool.query("INSERT INTO nimqulo_socket_tickets(hash,user_id,session_id,expires_at) VALUES('qa-bad','missing-account','qa',now())"),{code:"23503"});
      await assert.rejects(pool.query("INSERT INTO nimqulo_socket_tickets(hash,user_id,session_id,expires_at) VALUES('qa-existing',$1,'qa',now())",[alice]),{code:"23505"});
      await pool.query("DELETE FROM nimqulo_socket_tickets WHERE hash='qa-existing'");
    });
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
      assert.equal((await store.lookup(alice,`${prefix}_1`)).some(person=>person.id===bob),false);
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
    await t.test("same-second phone logins stay isolated and signing out revokes the binding",async()=>{
      const user=users[4],device=randomUUID(),first={id:user,approved:true,sessionId:`500.${randomUUID()}`,sessionStarted:500000};
      await store.authorize(first,device);
      await assert.rejects(store.authorize({...first,sessionId:`500.${randomUUID()}`},randomUUID()),{code:"SESSION_REPLACED"});
      const {createApp}=await import("../backend/app.ts");
      const app=createApp({messenger:store,authenticate:async()=>first},[]);
      assert.equal((await app.request("/session",{method:"DELETE",headers:{Authorization:"Bearer qa"}})).status,204);
      await assert.rejects(store.authorize(first,device),{code:"SESSION_EXPIRED"});
      await assert.rejects(store.authorize(first),{code:"SESSION_EXPIRED"});
      await store.authorize({...first,sessionId:`501.${randomUUID()}`,sessionStarted:501000},randomUUID());
      assert.equal((await pool.query("SELECT revoked FROM nimqulo_devices WHERE user_id=$1",[user])).rows[0].revoked,false);
    });
    await t.test("account approval is operator-only, preserves claims and enforces capacity and status",async()=>{
      const {createAccessAdmin}=await import("../backend/access-admin.ts");
      const target={uid:users[21],email:"qa@example.com",emailVerified:true,disabled:false,displayName:"Pending Google account",customClaims:{approved:false,other:"keep"},providerData:[{providerId:"google.com",email:"qa@example.com"}]};
      let updates=0,lookups=0;
      const access=createAccessAdmin({async listUsers(){lookups++;return {users:[target,{...target,uid:users[22],providerData:[]}]};},async getUser(id){lookups++;assert.equal(id,target.uid);return target;},async setCustomUserClaims(id,claims){assert.equal(id,target.uid);updates++;target.customClaims=claims;}},store);
      await assert.rejects(access.list(bob),{status:403});await assert.rejects(access.decide(bob,target.uid,true),{status:403});assert.equal(lookups,0);
      assert.equal((await access.list(alice)).accounts.length,1,"non-Google identities must not appear");
      await assert.rejects(access.decide(alice,alice,false),{status:403});
      await assert.rejects(access.decide(alice,target.uid,true),{code:"PILOT_FULL"});assert.equal(updates,0);
      await pool.query("UPDATE nimqulo_accounts SET approved=false WHERE user_id=$1",[users[19]]);
      await access.decide(alice,target.uid,true);assert.deepEqual(target.customClaims,{approved:true,other:"keep"});
      assert.equal((await pool.query("SELECT approved FROM nimqulo_accounts WHERE user_id=$1",[target.uid])).rows[0].approved,true);
      await store.authorize({id:target.uid,approved:true,sessionId:"qa_approval",sessionStarted:800},randomUUID());await store.device(target.uid,"ExpoPushToken[qa-approval]");
      await access.decide(alice,target.uid,false);
      assert.deepEqual((await pool.query("SELECT revoked,push_token FROM nimqulo_devices WHERE user_id=$1",[target.uid])).rows[0],{revoked:true,push_token:null});
      await pool.query("UPDATE nimqulo_accounts SET status='suspended' WHERE user_id=$1",[target.uid]);await assert.rejects(access.decide(alice,target.uid,true),{status:403});
      await pool.query("UPDATE nimqulo_accounts SET status='active' WHERE user_id=$1",[target.uid]);await pool.query("UPDATE nimqulo_accounts SET approved=true WHERE user_id=$1",[users[19]]);
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
    await t.test("private photo sharing validates ownership, retry safety, blocks, and membership periods",async()=>{
      const bytes=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1S8AAAAASUVORK5CYII=","base64");
      const retry=randomUUID();
      await assert.rejects(store.uploadChatImage(eve,direct,retry,bytes),{status:403});
      await assert.rejects(store.uploadChatImage(alice,direct,retry,Buffer.from("not a picture")),{status:400});
      const uploads=await Promise.all([store.uploadChatImage(alice,direct,retry,bytes),store.uploadChatImage(alice,direct,retry,bytes)]);
      assert.equal(uploads[0].id,uploads[1].id);assert.equal(objects.size,1);
      const imageId=uploads[0].id;
      await assert.rejects(store.chatImage(bob,direct,imageId),{status:404},"unpublished uploads cannot be viewed");
      await assert.rejects(store.uploadChatImage(alice,direct,retry,Buffer.concat([bytes,Buffer.from("different")])),{status:409});
      await assert.rejects(store.send(bob,direct,"Stolen image",randomUUID(),undefined,imageId),{status:403});
      await assert.rejects(store.send(alice,group,"Wrong chat",retry,undefined,imageId),{status:403});
      const message=await store.send(alice,direct,"",retry,undefined,imageId);
      assert.equal(message.imageId,imageId);assert.equal(message.text,"");
      assert.equal((await store.send(alice,direct,"",retry,undefined,imageId)).id,message.id);
      await assert.rejects(store.send(alice,direct,"",retry),{status:400});
      const url=(await store.chatImage(bob,direct,imageId)).url;
      assert.ok(url.startsWith("https://private.test/messages/"));
      await assert.rejects(store.chatImage(eve,direct,imageId),{status:403});
      assert.equal((await store.snapshot(bob)).conversations.find(c=>c.id===direct).message,"Photo");
      const quoted=await store.send(bob,direct,"Nice photo",randomUUID(),message.id);assert.equal(quoted.reply.text,"Photo");
      await store.block(bob,alice,true);
      await assert.rejects(store.chatImage(bob,direct,imageId),{status:403});
      await assert.rejects(store.uploadChatImage(alice,direct,randomUUID(),bytes),{status:403});
      await store.block(bob,alice,false);await connect(alice,bob);
      const groupRetry=randomUUID(),groupImage=(await store.uploadChatImage(alice,group,groupRetry,bytes)).id;
      await store.send(alice,group,"Group photo",groupRetry,undefined,groupImage);
      assert.ok((await store.chatImage(eve,group,groupImage)).url);
      await store.manageMember(alice,group,eve,"remove");
      await assert.rejects(store.chatImage(eve,group,groupImage),{status:403});
      await store.saveGroup(alice,"QA Group",[eve],group);
      const invitation=(await store.snapshot(eve)).invitations.find(i=>i.status==="pending"&&i.name==="QA Group");
      await store.decideInvitation(eve,invitation.id,"accepted");
      await assert.rejects(store.chatImage(eve,group,groupImage),{status:404},"rejoining cannot restore earlier photos");
      await pool.query("UPDATE nimqulo_messages SET deleted=true,body=NULL WHERE id=$1",[message.id]);
      assert.equal((await store.messageRecord(pool,message.id,bob)).imageId,undefined);
      await assert.rejects(store.chatImage(bob,direct,imageId),{status:404});
    });
    await t.test("chat image HTTP uploads keep their 5 MB limit and authenticate before storage",async()=>{
      const {createApp}=await import("../backend/app.ts");
      const app=createApp({messenger:store,authenticate:async()=>({id:bob,approved:true,sessionId:"qa_http",sessionStarted:400})},[]);
      const image=Buffer.alloc(26000);Buffer.from([137,80,78,71,13,10,26,10]).copy(image);
      const retry=randomUUID(),path=`/conversations/${direct}/images/${retry}`;
      assert.equal((await app.request(path,{method:"POST",body:image})).status,401);
      const response=await app.request(path,{method:"POST",headers:{Authorization:"Bearer qa"},body:image});
      assert.equal(response.status,201,"24 KB JSON cap must not apply to photos");
      assert.ok((await response.json()).id);
      assert.equal((await app.request(`/conversations/${direct}/images/${randomUUID()}`,{method:"POST",headers:{Authorization:"Bearer qa"},body:Buffer.alloc(5242881)})).status,413);
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
        if(String(url).includes("realtime.example"))return new Response("",{status:fail?503:200});
        if(String(url).includes("push/send")){pushCalls++;const body=JSON.parse(init.body);assert.equal(body.body,"You have a new message");return fail?new Response("",{status:503}):Response.json({data:{id:"qa_ticket",status:"ok"}});}
        if(String(url).includes("getReceipts"))return Response.json({data:{qa_ticket:{status:"error",details:{error:"DeviceNotRegistered"}}}});
        throw Error("Unexpected service call");
      };
      try{
        const sweep=createDelivery(store,{realtimeUrl:"https://realtime.example",serviceKey:"qa-key",identity:{active:async()=>true,deleteUser:async()=>{}},deleteObject:async()=>{}});
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
    await t.test("missing realtime configuration completes delivery without dispatch or repeated claims",async()=>{
      const {createDelivery}=await import("../backend/delivery.ts");
      await pool.query("UPDATE nimqulo_events SET realtime_done=true,push_done=true");
      const original=global.fetch;let calls=0;
      global.fetch=async()=>{calls++;throw Error("No dispatch expected");};
      try{
        for(const config of [{},{realtimeUrl:"https://realtime.example"},{serviceKey:"qa-key"}]){
          const {rows:[event]}=await pool.query("INSERT INTO nimqulo_events(user_id,kind,push_done) VALUES($1,'qa',true) RETURNING id",[bob]);
          const sweep=createDelivery(store,{...config,identity:{active:async()=>true,deleteUser:async()=>{}},deleteObject:async()=>{}});
          await sweep();await sweep();
          const saved=(await pool.query("SELECT realtime_done,push_done,attempts FROM nimqulo_events WHERE id=$1",[event.id])).rows[0];
          assert.deepEqual(saved,{realtime_done:true,push_done:true,attempts:1});
        }
        assert.equal(calls,0);
      }finally{global.fetch=original;}
    });
  } finally {await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
