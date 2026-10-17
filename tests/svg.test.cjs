const { test } = require('node:test');
const assert = require('node:assert/strict');
const svg = import('../src/lib/svg.ts');

test('SVG sources use Android-compatible Base64 with correct padding', async () => {
  const { svgSource } = await svg;
  for (const text of ['', 'a', 'ab', 'abc', 'abcd', 'abcde']) {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg"><text>${text}</text></svg>`;
    assert.equal(svgSource(markup).uri, `data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}`);
  }
});

test('SVG sources preserve Unicode text as UTF-8', async () => {
  const { svgSource } = await svg;
  const markup = '<svg xmlns="http://www.w3.org/2000/svg"><text>München · 東京 🎉</text></svg>';
  const encoded = svgSource(markup).uri.split(',')[1];
  assert.equal(Buffer.from(encoded, 'base64').toString('utf8'), markup);
});
