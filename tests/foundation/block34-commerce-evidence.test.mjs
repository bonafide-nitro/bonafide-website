// Block 34 (Issue #86): exact commerce destinations from the owner-supplied saved-page snapshot (ZANETA_DECISION).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCommerce, loadProducts } from '../../src/lib/data.mjs';
import { runQa } from '../../qa/checks.mjs';
import { loadInputs } from '../../qa/cli.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const S = 'https://www.nitrocoffee.store/collections/nitro-coffee/products/';
const ALLIANCE = {
  'caveman-coffee-nitro': S + 'caveman-organic-guatemala-pet-5-gal-keg',
  'gorongosa-coffee-nitro': S + 'girls-run-the-world-coffee-nitro-pet-5-gal-keg',
  'jittery-johns-nitro': S + 'jittery-johns-coffee-company-nitro-pet-5-gal-keg',
  'thai-treasures-espresso-nitro': S + 'thai-treasure-coffee-nitro-pet-5-gal-keg',
  'cult-uganda-white-nile-nitro': S + 'cult-artisan-beverage-co-uganda-white-nile-nitro-pet-5-gal-keg',
  'thanksgiving-coffee-nitro': S + 'thanksgiving-coffee-compnay-nitro-pet-5-gal-keg',
};
const AMAZON = [
  'B01N1001H9', 'B0BQN58DQR', 'B0BQ7JCS18', 'B0BQJNJTVY', 'B073WMK2FL', 'B0BQN2SQ2M', 'B01NCV8CAE',
  'B0BQN1P82W', 'B071J91343', 'B0BQN3876K', 'B074JJ5CST', 'B0BQJNW91V', 'B0BQMZKWM1',
];
const hrefs = (f) => [...fs.readFileSync(f, 'utf8').matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]);

test('each Alliance product carries exactly its labelled snapshot store href, wholesale only', () => {
  const byId = new Map(loadProducts().map((p) => [p.id, p]));
  for (const [id, href] of Object.entries(ALLIANCE)) {
    assert.equal(byId.get(id).links.store, href, id);
    assert.deepEqual(byId.get(id).views, ['wholesale'], id);
  }
});

t('/products-2/ renders all six Alliance hrefs; /products/ renders none of them', () => {
  const p2 = hrefs('dist/products-2/index.html');
  const p1 = hrefs('dist/products/index.html');
  for (const h of Object.values(ALLIANCE)) { assert.ok(p2.includes(h), h); assert.ok(!p1.includes(h), h); }
});

t('Alliance hrefs are not reused across Alliance products and the Alliance registry entry is gone', () => {
  assert.equal(new Set(Object.values(ALLIANCE)).size, 6);
  assert.ok(!loadCommerce().unresolved.some((u) => u.id === 'products-2-alliance-store'));
});

test('the 13 /products/ Amazon URLs stay recorded in snapshot order (mapped to products in Block 35)', () => {
  const cfg = JSON.parse(fs.readFileSync('qa/qa.config.json', 'utf8'));
  const am = cfg.commerceInventory.pages['/products/'].amazon;
  assert.equal(am.length, 13);
  assert.equal(new Set(am).size, 13);
  assert.deepEqual(am.map((u) => u.match(/\/dp\/([A-Z0-9]{10})$/)[1]), AMAZON);
  for (const u of am) assert.equal(new URL(u).hostname, 'www.amazon.com');
  assert.deepEqual(cfg.commerceInventory.pages['/products/'].store, []);
  assert.deepEqual(cfg.commerceInventory.pages['/products-2/'].store, []);
});

t('/products-2/ stays Amazon-free (Amazon is rendered on /products/ only, Block 35)', () => {
  assert.ok(!hrefs('dist/products-2/index.html').some((u) => /amazon|amzn/i.test(u)));
});

t('strict QA: the 13 Amazon URLs are all rendered; only the store shortfalls remain (Block 35)', () => {
  const strict = runQa({ ...loadInputs(), distDir: 'dist', mode: 'strict' });
  const f = strict.findings.filter((x) => x.path === '/products/' || x.path === '/products-2/');
  const n = (code, path) => f.filter((x) => x.code === code && x.path === path).length;
  assert.equal(n('commerce-destination-missing', '/products/'), 0);
  assert.equal(n('amazon-links-min', '/products/'), 0);
  assert.equal(n('store-links-min', '/products-2/'), 1);
  assert.match(f.find((x) => x.code === 'store-links-min' && x.path === '/products-2/').message, /found 18/);
  assert.equal(strict.passed, false);
  assert.equal(runQa({ ...loadInputs(), distDir: 'dist', mode: 'foundation' }).blocking.length, 0);
});
