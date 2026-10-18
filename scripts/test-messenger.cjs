// Explicitly require an isolated test host; never run this against the app's URL.
const { spawnSync } = require("node:child_process");
const url = new URL(process.env.DATABASE_URL_UNPOOLED);
const host = process.env.MESSENGER_TEST_HOST;
if (!host || !host.startsWith("ep-") || host === url.hostname || host.includes("-pooler")) throw Error("Set MESSENGER_TEST_HOST to the isolated branch's direct endpoint.");
url.hostname = host;
const env = { ...process.env, DATABASE_URL_UNPOOLED: url.href, MESSENGER_TEST_DATABASE_URL: url.href };
for (const args of [["scripts/migrate.cjs"], ["--experimental-strip-types", "--test", "tests/messenger.test.cjs"]]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
