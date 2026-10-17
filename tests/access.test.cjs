const { test } = require('node:test');
const assert = require('node:assert/strict');
const access = import('../src/lib/access.ts');

test('an admin-approved account lands on profile setup', async () => {
  const { isAccountApproved, getPostSignInRoute } = await access;
  const user = { publicMetadata: { approved: true } };
  assert.equal(isAccountApproved(user), true);
  assert.equal(getPostSignInRoute(user), '/profile-setup');
});

test('missing, pending, or malformed approval lands on Access Required', async () => {
  const { isAccountApproved, getPostSignInRoute } = await access;
  for (const value of [undefined, null, false, 'true', 1, {}, 'approved']) {
    const user = { publicMetadata: { approved: value } };
    assert.equal(isAccountApproved(user), false);
    assert.equal(getPostSignInRoute(user), '/access-required');
  }
  for (const user of [null, undefined, {}, { publicMetadata: null }]) {
    assert.equal(getPostSignInRoute(user), '/access-required');
  }
});

test('editable profile metadata cannot approve an account', async () => {
  const { getPostSignInRoute } = await access;
  assert.equal(getPostSignInRoute({
    publicMetadata: { approved: false },
    unsafeMetadata: { approved: true, profileSetupComplete: true, displayName: 'Alex' },
    username: 'alexcarter',
  }), '/access-required');
});

test('revoking approval blocks a previously approved account', async () => {
  const { getPostSignInRoute } = await access;
  const user = { publicMetadata: { approved: true } };
  assert.equal(getPostSignInRoute(user), '/profile-setup');
  user.publicMetadata.approved = false;
  assert.equal(getPostSignInRoute(user), '/access-required');
});
