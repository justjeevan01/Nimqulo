const { spawnSync } = require("node:child_process");
const path = require("node:path");
if(!process.env.REALTIME_SERVICE_KEY)throw Error("Missing local realtime service key");
const result=spawnSync(process.execPath,[path.resolve("realtime/node_modules/wrangler/bin/wrangler.js"),"secret","put","SERVICE_KEY","--env=",...(process.argv.includes("--local")?["--local"]:[])],{cwd:path.resolve("realtime"),input:process.env.REALTIME_SERVICE_KEY,encoding:"utf8"});
process.stdout.write(result.stdout||"");process.stderr.write(result.stderr||"");process.exitCode=result.status||0;
