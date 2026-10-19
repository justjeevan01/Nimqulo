import type { Auth } from "firebase-admin/auth";
import type { MessengerStore } from "./messenger-store.ts";
import { ServiceError } from "./messenger-types.ts";

export function createAccessAdmin(auth:Pick<Auth,"listUsers"|"getUser"|"setCustomUserClaims">,store:MessengerStore){
  return {
    async list(actor:string,cursor?:string){
      await store.operator(actor);
      if(cursor&&cursor.length>2048)throw new ServiceError(400,"Invalid account cursor.");
      const page=await auth.listUsers(100,cursor);
      const users=page.users.filter(user=>!user.disabled&&user.emailVerified&&user.email&&user.providerData.some(p=>p.providerId==="google.com"&&p.email?.toLowerCase()===user.email!.toLowerCase()));
      const {rows}=await store.pool.query("SELECT user_id,status FROM nimqulo_accounts WHERE user_id=ANY($1::text[])",[users.map(user=>user.uid)]);
      return {accounts:users.map(user=>({id:user.uid,email:user.email!,name:user.displayName||user.email!,approved:user.customClaims?.approved===true,operator:store.operators.includes(user.uid),status:rows.find(row=>row.user_id===user.uid)?.status||"active"})),next:page.pageToken};
    },
    async decide(actor:string,id:string,approved:boolean){
      await store.operator(actor);
      if(!id||id.length>128||typeof approved!=="boolean")throw new ServiceError(400,"Choose an account and decision.");
      if(!approved&&store.operators.includes(id))throw new ServiceError(403,"Administrator access cannot be revoked here.");
      const target=await auth.getUser(id);
      if(target.disabled||!target.emailVerified||!target.email||!target.providerData.some(p=>p.providerId==="google.com"&&p.email?.toLowerCase()===target.email!.toLowerCase()))throw new ServiceError(403,"A verified Google account is required.");
      await store.mutate(actor,async db=>{
        const {rows:[account]}=await db.query("SELECT * FROM nimqulo_accounts WHERE user_id=$1",[id]);
        if(approved&&account&&account.status!=="active")throw new ServiceError(403,"This account is suspended or deleted.");
        if(approved&&!account?.approved){const {rows:[count]}=await db.query("SELECT count(*)::int AS n FROM nimqulo_accounts WHERE approved AND status='active'");if(count.n>=20)throw new ServiceError(403,"The initial 20-person limit has been reached.","PILOT_FULL");}
        await auth.setCustomUserClaims(id,{...target.customClaims,approved});
        await db.query("INSERT INTO nimqulo_accounts(user_id,approved) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET approved=$2",[id,approved]);
        if(!approved)await db.query("UPDATE nimqulo_devices SET revoked=true,push_token=NULL WHERE user_id=$1",[id]);
        await store.event(db,[id],"session");
      });
    },
  };
}
