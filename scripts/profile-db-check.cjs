// Run against an isolated Neon branch, never the production connection.
const assert = require("node:assert/strict");
const { Pool } = require("pg");
const { randomUUID } = require("node:crypto");
(async () => {
  const url = new URL(process.env.DATABASE_URL_UNPOOLED);
  const host = process.env.PROFILE_TEST_BRANCH_HOST;
  if (!host || !/^ep-[a-z0-9-]+\.ap-southeast-1\.aws\.neon\.tech$/.test(host) || host === url.hostname) throw new Error("Supply PROFILE_TEST_BRANCH_HOST for an isolated branch.");
  url.hostname = host;
  const pool = new Pool({ connectionString: url.toString(), max: 3 });
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const users = [`qa_${suffix}_1`, `qa_${suffix}_2`];
  try {
    const username = `qa_${suffix}`;
    const writes = await Promise.allSettled(users.map(user => pool.query("INSERT INTO nimqulo_profiles (user_id, display_name, username) VALUES ($1,$2,$3)", [user, "QA profile", username])));
    assert.equal(writes.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(writes.find(result => result.status === "rejected").reason.code, "23505");
    console.log("PASS: concurrent username claims create exactly one profile");
    const owner = users[writes.findIndex(result => result.status === "fulfilled")];
    await assert.rejects(pool.query("UPDATE nimqulo_profiles SET username=$1 WHERE user_id=$2", [`other_${suffix}`, owner]), { code: "23514" });
    await assert.rejects(pool.query("INSERT INTO nimqulo_profiles (user_id,display_name,username) VALUES ($1,'QA','UPPERCASE')", [`qa_${suffix}_bad`]), { code: "23514" });
    console.log("PASS: database rejects username mutation and non-normalized usernames");
    await pool.query("UPDATE nimqulo_profiles SET display_name='QA updated' WHERE user_id=$1", [owner]);
    assert.equal((await pool.query("SELECT display_name FROM nimqulo_profiles WHERE user_id=$1", [owner])).rows[0].display_name, "QA updated");
    console.log("PASS: display name remains editable");
  } finally { await pool.query("DELETE FROM nimqulo_profiles WHERE user_id = ANY($1::text[])", [users]); await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
