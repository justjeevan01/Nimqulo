const test = require("node:test");
const assert = require("node:assert/strict");
const actionModule = import("../src/lib/sign-out.ts");

test("sign-out waits for session revocation and shares concurrent requests", async () => {
  const { createSignOutAction } = await actionModule;
  let finish,
    revoked = 0,
    navigated = 0;
  const signOut = createSignOutAction(
    () => true,
    () => {
      revoked++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    () => {
      navigated++;
    },
  );
  const first = signOut();
  assert.equal(signOut(), first);
  assert.equal(revoked, 1);
  assert.equal(navigated, 0);
  finish();
  await first;
  assert.equal(navigated, 1);
});

test("failed sign-out keeps the current screen and allows a retry", async () => {
  const { createSignOutAction } = await actionModule;
  let attempts = 0,
    navigated = 0;
  const signOut = createSignOutAction(
    () => true,
    async () => {
      if (++attempts === 1) throw new Error("offline");
    },
    () => {
      navigated++;
    },
  );
  await assert.rejects(signOut(), /offline/);
  assert.equal(navigated, 0);
  await signOut();
  assert.equal(attempts, 2);
  assert.equal(navigated, 1);
});

test("an uninitialized account client cannot report a successful sign-out", async () => {
  const { createSignOutAction } = await actionModule;
  let ready = false,
    revoked = 0,
    navigated = 0;
  const signOut = createSignOutAction(
    () => ready,
    async () => {
      revoked++;
    },
    () => {
      navigated++;
    },
  );
  await assert.rejects(signOut(), /session is still loading/);
  assert.equal(revoked, 0);
  assert.equal(navigated, 0);
  ready = true;
  await signOut();
  assert.equal(revoked, 1);
  assert.equal(navigated, 1);
});
