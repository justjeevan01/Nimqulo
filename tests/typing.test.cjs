const test=require('node:test'),assert=require('node:assert/strict');
const conversationId='12345678-1234-4234-9234-123456789012';
test('typing state expires, ignores self, strips content and stops only the matching user',async()=>{
 const {applyTypingActivity}=await import('../src/lib/typing.ts');const packet={conversationId,userId:'peer',name:'Alex',typing:true,ttlMs:6000,text:'must not be retained',expiresAt:999999999};
 let state=applyTypingActivity([],packet,'me',1000);assert.equal(state[0].expiresAt,7000);assert.equal(state[0].text,undefined);
 state=applyTypingActivity(state,{...packet,userId:'second'},'me',2000);assert.equal(state.length,2);
 assert.equal(applyTypingActivity(state,{...packet,userId:'me'},'me',2000).length,2);
 state=applyTypingActivity(state,{...packet,typing:false},'me',2000);assert.deepEqual(state.map(x=>x.userId),['second']);
 assert.equal(applyTypingActivity(state,null,'me',8000).length,0);
 assert.equal(applyTypingActivity([],{...packet,ttlMs:60001},'me',1000).length,0);
});
test('typing sender throttles keystrokes and keeps stop ordered after a slow start',async()=>{
 const {createTypingSender}=await import('../src/lib/typing.ts');const sent=[];let finish;let now=0;
 const sender=createTypingSender(value=>{sent.push(value);return sent.length===1?new Promise(resolve=>{finish=resolve;}):Promise.resolve();},()=>now);
 sender.input(true);assert.deepEqual(sent,[]);sender.setEnabled(true);sender.input(true);now=100;sender.input(true);sender.input(false);assert.deepEqual(sent,[true]);
 finish();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(sent,[true,false]);sender.setEnabled(false);sender.input(true);assert.deepEqual(sent,[true,false]);
});
test('typing stops after input becomes idle',async()=>{
 const {createTypingSender}=await import('../src/lib/typing.ts');const sent=[];const sender=createTypingSender(async value=>{sent.push(value);});
 sender.setEnabled(true);sender.input(true);await new Promise(resolve=>setTimeout(resolve,2600));assert.deepEqual(sent,[true,false]);sender.setEnabled(false);
});
