// Operator-only command. Credentials are read from the ignored server env file.
const {initializeApp,cert}=require("firebase-admin/app"),{getAuth}=require("firebase-admin/auth"),{Pool}=require("pg");
(async()=>{
 const [action,email]=process.argv.slice(2);
 if(!["list","approve","revoke"].includes(action)||(action!=="list"&&!email))throw Error("Usage: node --env-file=.env.release scripts/manage-access.cjs list | approve <email> | revoke <email>");
 if(!process.env.FIREBASE_ADMIN_CONFIG||!process.env.DATABASE_URL)throw Error("Load the release server environment first.");
 const auth=getAuth(initializeApp({credential:cert(JSON.parse(Buffer.from(process.env.FIREBASE_ADMIN_CONFIG,"base64").toString("utf8"))),projectId:process.env.FIREBASE_PROJECT_ID}));
 if(action==="list"){let page;do{const users=await auth.listUsers(100,page);for(const user of users.users)console.log(`${user.email||user.uid}\t${user.disabled?"disabled":user.customClaims?.approved===true?"approved":"pending"}`);page=users.pageToken;}while(page);return;}
 const user=await auth.getUserByEmail(email);
 if(!user.emailVerified||!user.providerData.some(p=>p.providerId==="google.com"&&p.email?.toLowerCase()===user.email.toLowerCase()))throw Error("The person must first sign in with their verified Google account.");
 const approved=action==="approve",pool=new Pool({connectionString:process.env.DATABASE_URL});
 const db=await pool.connect();try{
  await db.query("BEGIN");await db.query("SELECT pg_advisory_xact_lock(817235002)");
  const {rows:[account]}=await db.query("SELECT * FROM nimqulo_accounts WHERE user_id=$1",[user.uid]);
  if(approved&&(user.disabled||(account&&account.status!=="active")))throw Error("This account cannot be approved while suspended or deleted.");
  if(approved&&!(account?.approved)){const {rows:[count]}=await db.query("SELECT count(*)::int AS n FROM nimqulo_accounts WHERE approved AND status='active'");if(count.n>=20)throw Error("The initial 20-person limit has been reached.");}
  await auth.setCustomUserClaims(user.uid,{...user.customClaims,approved});
  await db.query("INSERT INTO nimqulo_accounts(user_id,approved) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET approved=$2",[user.uid,approved]);
  if(!approved)await db.query("UPDATE nimqulo_devices SET revoked=true,push_token=NULL WHERE user_id=$1",[user.uid]);
  await db.query("INSERT INTO nimqulo_events(user_id,kind,push_done) VALUES($1,'session',true)",[user.uid]);
  await db.query("COMMIT");console.log(`${approved?"Approved":"Revoked"}: ${user.email}`);
 }catch(error){await db.query("ROLLBACK");throw error;}finally{db.release();await pool.end();}
})().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
