// Block 57 (Issue #130): evidence-to-page reconciliation for /products/ and /products-2/.
// Doc 03 §4c records the "Nitro Coffee For Home" heading level on each page (retail H3, wholesale H2).
// The three retail sections recorded only as truncated stubs in doc 39 stay unresolved and must not be fabricated.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = (p) => fs.readFileSync(`src/pages/${p}/index.astro`, 'utf8');
const headings = (s) => [...s.matchAll(/<h([1-3])>(.*?)<\/h\1>/g)].map((m) => ({ level: +m[1], text: m[2].replace(/&amp;/g, '&') }));

test('doc 03: retail "Nitro Coffee For Home" is H3', () => {
  const h = headings(src('products')).filter((x) => /^Nitro Coffee For Home$/.test(x.text));
  assert.deepEqual(h, [{ level: 3, text: 'Nitro Coffee For Home' }]);
});

test('doc 03: wholesale "Nitro Coffee for Home" is H2', () => {
  const h = headings(src('products-2')).filter((x) => /^Nitro Coffee for Home$/.test(x.text));
  assert.deepEqual(h, [{ level: 2, text: 'Nitro Coffee for Home' }]);
});

test('routes stay separate, self-canonical, scaffolded, with distinct contracts', () => {
  const r = src('products');
  const w = src('products-2');
  assert.match(r, /canonicalPath="\/products\/"/);
  assert.match(w, /canonicalPath="\/products-2\/"/);
  assert.match(r, /\bscaffold>/);
  assert.match(w, /\bscaffold>/);
  assert.match(r, /180\+ Days/);
  assert.match(w, /120 days/);
  assert.doesNotMatch(w, /amazon\.com/i);
  assert.match(w, /Direct Distribution Program/);
});

test('retail sections formerly truncated in doc 39 appear only with the exact export wording (Issue #147)', async () => {
  const { entry, plain } = await import('./block63-helper.mjs');
  const r = src('products');
  const exportHeadings = entry('products').blocks.filter((b) => b.t === 'h').map((b) => plain(b.html).trim());
  for (const stub of ['Brewing Craft', 'Buy Nitro Cold Brew Kegs', 'Buy Better Than Cold Brew']) {
    const full = exportHeadings.find((h) => h.startsWith(stub));
    assert.ok(full, `${stub}: no full heading in the export evidence`);
    assert.ok(r.includes(full), `${stub}: page must carry the exact export heading "${full}"`);
  }
});

