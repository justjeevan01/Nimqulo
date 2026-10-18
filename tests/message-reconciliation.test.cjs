const test=require("node:test"),assert=require("node:assert/strict");
test("confirmed history replaces pending retries without duplicate bubbles",async()=>{
 const {reconcileMessages}=await import("../src/lib/message-reconciliation.ts");
 const committed={id:"server",retryId:"retry",seq:4,text:"Hello"};
 assert.deepEqual(reconcileMessages([committed],[{id:"retry",retryId:"retry",pending:true,text:"Hello"}]),[committed]);
 assert.deepEqual(reconcileMessages([],[{...committed,local:true}]),[{...committed,local:true}]);
});
test("empty verified history discards old cached membership text and reconciles deletions",async()=>{
 const {reconcileMessages,restoreMessages}=await import("../src/lib/message-reconciliation.ts");
 const cached=restoreMessages([{id:"old",retryId:"old",seq:12,text:"Old membership text",local:true}]);
 assert.deepEqual(reconcileMessages([],cached),[]);
 const deleted={id:"old",retryId:"old",seq:12,text:"Message deleted"};
 assert.deepEqual(reconcileMessages([deleted],cached),[deleted]);
});
test("restart keeps unconfirmed work for manual retry with its original identifier",async()=>{
 const {restoreMessages,reconcileMessages}=await import("../src/lib/message-reconciliation.ts");
 const restored=restoreMessages([{id:"retry",retryId:"retry",pending:true,text:"Offline draft"}]);
 assert.equal(restored[0].pending,false);assert.equal(restored[0].failed,true);assert.equal(restored[0].retryId,"retry");
 assert.deepEqual(reconcileMessages([],restored),restored);
});
