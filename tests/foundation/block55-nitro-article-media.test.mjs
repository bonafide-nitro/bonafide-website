// Block 55 (Issue #126): /what-is-nitro-cold-brew-coffee/ media stays evidence-bound.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const ROUTE = '/what-is-nitro-cold-brew-coffee/';
const IMG = '/wp-content/uploads/2020/07/What-is-nitro-Coffee-Explained-simple-Bona-Fide.jpg';
const config = JSON.parse(fs.readFileSync('qa/qa.config.json', 'utf8'));
const src = fs.readFileSync('src/pages/what-is-nitro-cold-brew-coffee/index.astro', 'utf8');
const bytes = fs.readFileSync(`public${IMG}`);

test('the pinned original is intact at its exact historical path', () => {
  assert.equal(bytes.length, 100272);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), 'aa1458e18e54342f2e9de7ef4d49d4f45c43ef65ab4ebaa1876cc69acba2dc2d');
});

test('QA blocker no longer calls the existing binary missing, and records the evidence gap', () => {
  const why = config.articleScaffold.remaining[ROUTE];
  assert.ok(why, 'route stays in remaining');
  assert.ok(!/missing T7 binary/i.test(why));
  assert.match(why, /ranking-list/);
});

test('source comment is not stale and the route stays scaffolded', () => {
  assert.ok(!/images and meta description are not evidenced/.test(src));
  assert.match(src, /<Base\b[^>]*\sscaffold(\s|>|\/)/);
});

test('ranking-only image is not rendered on the route (source)', () => {
  assert.ok(!/<img\b/i.test(src));
  assert.ok(!/src=["'][^"']*Explained-simple/.test(src));
});

test('no other article route references the image', () => {
  for (const p of config.articleRoutes.filter((r) => r !== ROUTE)) {
    assert.ok(!fs.readFileSync(`src/pages${p}index.astro`, 'utf8').includes('Explained-simple'), p);
  }
});

const built = fs.existsSync('dist/index.html');
test('built route does not reference the image', { skip: !built && 'dist/ not built' }, () => {
  assert.ok(!fs.readFileSync(`dist${ROUTE}index.html`, 'utf8').includes('Explained-simple'));
});
