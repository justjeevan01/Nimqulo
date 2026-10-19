const test=require("node:test"),assert=require("node:assert/strict");
const {randomUUID}=require("node:crypto");
test("Firebase sessions require verified Google identity, current admin approval, and a stable login binding",async()=>{
 const {createFirebaseAuthenticator,firebaseSessionActive}=await import("../backend/firebase-auth.ts");
 const nonce=randomUUID();let error;
 const payload={uid:"firebase-alice",auth_time:1000,email_verified:true,firebase:{sign_in_provider:"google.com",identities:{"google.com":["google-alice"]}}};
 const user={uid:payload.uid,disabled:false,emailVerified:true,email:"alice@example.com",customClaims:{approved:true},providerData:[{providerId:"google.com",email:"alice@example.com",uid:"google-alice"}],tokensValidAfterTime:new Date(0).toUTCString()};
 let verified=0;
 const authenticate=createFirebaseAuthenticator({async verifyIdToken(token){verified++;assert.equal(token,"signed-firebase-token");if(error)throw error;return payload;},async getUser(uid){assert.equal(uid,payload.uid);return user;}});
 const identity=await authenticate("signed-firebase-token",nonce);
 assert.deepEqual(identity,{id:payload.uid,approved:true,sessionId:`1000.${nonce}`,sessionStarted:1000000});
 assert.equal((await authenticate("signed-firebase-token",nonce)).sessionId,identity.sessionId,"token refresh preserves the session binding");
 assert.notEqual((await authenticate("signed-firebase-token",randomUUID())).sessionId,identity.sessionId,"same-second logins have distinct bindings and cannot share one phone session");
 const before=verified;await assert.rejects(authenticate("signed-firebase-token"),{status:401});await assert.rejects(authenticate("signed-firebase-token","not-a-uuid"),{status:401});assert.equal(verified,before);
 for(const approved of [false,"true",undefined]){user.customClaims.approved=approved;assert.equal((await authenticate("signed-firebase-token",nonce)).approved,false);}
 user.customClaims.approved=true;assert.equal(firebaseSessionActive(user,identity.sessionId),true);
 user.tokensValidAfterTime=new Date(1001000).toUTCString();await assert.rejects(authenticate("signed-firebase-token",nonce),{status:401});assert.equal(firebaseSessionActive(user,identity.sessionId),false);user.tokensValidAfterTime=new Date(0).toUTCString();
 for(const provider of ["password","custom",undefined]){payload.firebase.sign_in_provider=provider;await assert.rejects(authenticate("signed-firebase-token",nonce),{status:401});}payload.firebase.sign_in_provider="google.com";
 payload.email_verified=false;await assert.rejects(authenticate("signed-firebase-token",nonce),{status:401});payload.email_verified=true;
 user.disabled=true;await assert.rejects(authenticate("signed-firebase-token",nonce),{status:401});user.disabled=false;
 user.providerData[0].uid="different-google-user";await assert.rejects(authenticate("signed-firebase-token",nonce),{status:401});user.providerData[0].uid="google-alice";
 error={code:"auth/id-token-expired"};await assert.rejects(authenticate("signed-firebase-token",nonce),{status:401});
 error={code:"auth/internal-error"};await assert.rejects(authenticate("signed-firebase-token",nonce),{status:503});
});
