const test=require('node:test'),assert=require('node:assert/strict');
test('chat date labels respect local calendar boundaries and do not merge years',async()=>{
 const {chatDay,chatDateLabel}=await import('../src/lib/chat-presentation.ts');
 const now=new Date(2026,0,1,0,30);
 assert.equal(chatDateLabel(new Date(2026,0,1,0,1).toISOString(),now),'Today');
 assert.equal(chatDateLabel(new Date(2025,11,31,23,50).toISOString(),now),'Yesterday');
 assert.notEqual(chatDay(new Date(2025,0,1).toISOString()),chatDay(now.toISOString()));
 assert.equal(chatDay('invalid'),undefined);
});
test('reply gestures reject scrolling, diagonals, short drags and cancelled swipes',async()=>{
 const {shouldStartReply,shouldFinishReply}=await import('../src/lib/chat-presentation.ts');
 assert.equal(shouldStartReply(30,2,false),true);
 for(const [dx,dy,moving]of [[2,60,false],[40,30,false],[40,2,true],[-60,0,false]])assert.equal(shouldStartReply(dx,dy,moving),false);
 assert.equal(shouldFinishReply(60,3,false),true);
 for(const [dx,dy,cancelled]of [[30,0,false],[70,30,false],[70,0,true]])assert.equal(shouldFinishReply(dx,dy,cancelled),false);
});


test('People badges count incoming requests and pending invitations, and clear after decisions',async()=>{
 const {pendingPeopleActivity}=await import('../src/lib/people-activity.ts');
 const snapshot={requests:[{id:'incoming',direction:'incoming'},{id:'outgoing',direction:'outgoing'}],invitations:[{id:'pending',status:'pending'},{id:'accepted',status:'accepted'},{id:'declined',status:'declined'}]};
 assert.deepEqual(pendingPeopleActivity(snapshot),{requests:1,invitations:1,total:2});
 snapshot.requests=snapshot.requests.filter(request=>request.id!=='incoming');
 snapshot.invitations[0].status='accepted';
 assert.deepEqual(pendingPeopleActivity(snapshot),{requests:0,invitations:0,total:0});
});
