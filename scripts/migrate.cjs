const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
(async () => {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url || new URL(url).hostname.includes("-pooler")) throw new Error("Set DATABASE_URL_UNPOOLED to the direct migration connection.");
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(817234901)");
    await client.query("CREATE TABLE IF NOT EXISTS nimqulo_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of fs.readdirSync(path.join(__dirname, "../backend/migrations")).filter(n => n.endsWith(".sql")).sort()) {
      if ((await client.query("SELECT 1 FROM nimqulo_migrations WHERE name=$1", [name])).rowCount) continue;
      await client.query(fs.readFileSync(path.join(__dirname, "../backend/migrations", name), "utf8"));
      await client.query("INSERT INTO nimqulo_migrations (name) VALUES ($1)", [name]);
      console.log(`Applied ${name}`);
    }
    await client.query(process.argv.includes("--dry-run") ? "ROLLBACK" : "COMMIT");
    console.log(process.argv.includes("--dry-run") ? "Migration dry run passed (rolled back)" : "Database migrations passed");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { await client.end(); }
})().catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted connection]")); process.exitCode = 1; });
