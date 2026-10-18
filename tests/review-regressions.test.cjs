const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm");

test("realtime secret push selects the requested environment without exposing the key in arguments", () => {
  const source = fs.readFileSync("scripts/push-realtime-secret.cjs", "utf8");
  for (const [args, expected] of [[[], ""], [["--local"], ""], [["--env", "pilot"], "pilot"], [["--env=pilot", "--local"], "pilot"], [["--env=staging"], "staging"]]) {
    let invocation;
    const proc = { argv: ["node", "script", ...args], execPath: process.execPath, env: { REALTIME_SERVICE_KEY: "qa-not-a-secret" }, stdout: { write() {} }, stderr: { write() {} } };
    vm.runInNewContext(source, { process: proc, require: name => name === "node:child_process" ? { spawnSync: (...values) => { invocation = values; return { status: 0 }; } } : require(name) });
    assert.ok(invocation[1].includes(`--env=${expected}`));
    assert.equal(invocation[1].includes("--local"), args.includes("--local"));
    assert.equal(invocation[1].includes("qa-not-a-secret"), false);
    assert.equal(invocation[2].input, "qa-not-a-secret");
  }
});

test("group details only allows eligible leaves, reports failure, and navigates after success", async () => {
  const { transformSync } = require("esbuild");
  const file = "src/app/(app)/group-details/[id].tsx";
  const code = transformSync(fs.readFileSync(file, "utf8"), { loader: "tsx", format: "cjs", jsx: "automatic" }).code;
  const group = { id: "qa-group", name: "QA", myRole: "Owner", members: [{}, {}] };
  let leaves = 0, failure = true;
  const alerts = [], destinations = [];
  const modules = {
    "react/jsx-runtime": { jsx: (_type, props) => ({ props }) },
    "react-native": { Alert: { alert: (...args) => alerts.push(args) } },
    "expo-router": { useLocalSearchParams: () => ({ id: group.id }), router: { dismissTo: path => destinations.push(path) } },
    "@/components/community/group-details-screen": { GroupDetailsScreen() {} },
    "@/state/community-fixtures": { useCommunity: () => ({ groups: [group], async leaveGroup(id) { assert.equal(id, group.id); leaves++; if (failure) throw new Error("QA leave failed"); } }) },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, Error, require: name => { assert.ok(name in modules, name); return modules[name]; } });
  const route = module.exports.default;
  assert.equal(route().props.onLeave, undefined, "owner must transfer ownership first");
  group.myRole = "Admin";
  route().props.onLeave();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(leaves, 1);
  assert.deepEqual(alerts, [["Could not leave group", "QA leave failed"]]);
  assert.deepEqual(destinations, []);
  failure = false;
  route().props.onLeave();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(destinations, ["/home"]);
  group.myRole = "Owner"; group.members = [{}];
  assert.equal(typeof route().props.onLeave, "function", "a sole owner can leave");
});
