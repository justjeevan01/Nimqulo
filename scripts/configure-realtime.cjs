const fs = require("node:fs");
const { randomBytes } = require("node:crypto");
(async()=>{
  let source=fs.readFileSync(".env","utf8");
  const key=process.env.REALTIME_SERVICE_KEY||randomBytes(32).toString("base64url");
  if(!process.env.REALTIME_SERVICE_KEY){source+=`\nREALTIME_SERVICE_KEY=${key}\n`;fs.writeFileSync(".env",source);}
  fs.writeFileSync("realtime/.dev.vars",`SERVICE_KEY=${key}\n`);
  if(!process.env.OPERATOR_USER_IDS&&process.env.BACKEND_TEST_USER_ID){
    const response=await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(process.env.BACKEND_TEST_USER_ID)}`,{headers:{Authorization:`Bearer ${process.env.CLERK_SECRET_KEY}`}});
    if(!response.ok)throw Error("Could not verify the owner account");
    const user=await response.json();
    const email=user.email_addresses.find(e=>e.id===user.primary_email_address_id);
    if(user.public_metadata?.approved===true&&email?.email_address?.toLowerCase()==="jeevanofficial1120@gmail.com"){
      fs.appendFileSync(".env",`OPERATOR_USER_IDS=${user.id}\n`);console.log("Configured the approved app owner as the development operator.");
    }else console.log("Operator not configured: local test account is not the approved app owner.");
  }
  console.log("Realtime shared secret stored only in ignored local environment files.");
})().catch(error=>{console.error(error.message);process.exitCode=1;});
