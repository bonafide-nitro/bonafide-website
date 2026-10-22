// Block 35 (Issue #88): per-product Amazon hrefs proven by the owner-supplied original /products/ page (WP page 147).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProducts } from '../../src/lib/data.mjs';
import { runQa } from '../../qa/checks.mjs';
import { loadInputs } from '../../qa/cli.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const A = 'https://www.amazon.com/';
// product id -> { nitro, still } exactly as ordered under each "BUY ... NOW!" heading in the original page.
const MAP = {
  'hair-raiser-organic': { nitro: A + 'Bona-Craft-Draft-Nitro-Coffee/dp/B01N1001H9', still: A + 'dp/B0BQN58DQR' },
  'espresso-nitro-organic': { nitro: A + 'Nitro-Cold-Espresso-Coffee-Organic/dp/B0BQ7JCS18', still: A + 'dp/B0BQJNJTVY' },
  'ethiopia-yirgacheffe-organic': { nitro: A + 'dp/B073WMK2FL', still: A + 'dp/B0BQN2SQ2M' },
  'peru-organic': { nitro: A + 'dp/B01NCV8CAE', still: A + 'dp/B0BQN1P82W' },
  'guatemala-organic': { nitro: A + 'dp/B071J91343', still: A + 'dp/B0BQN3876K' },
  'hibiscus-tea': { nitro: A + 'Bona-Fide-Brewing-Company-Hibiscus/dp/B074JJ5CST' },
  'caramel-coffee': { nitro: A + 'dp/B0BQJNW91V', still: A + 'dp/B0BQMZKWM1' },
};
const hrefs = (f) => [...fs.readFileSync(f, 'utf8').matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]);

test('exactly the 7 evidenced products carry Amazon hrefs, per style, byte-for-byte', () => {
  const withAmazon = loadProducts().filter((p) => p.links?.amazon);
  assert.deepEqual(withAmazon.map((p) => p.id).sort(), Object.keys(MAP).sort());
  for (const p of withAmazon) assert.deepEqual(p.links.amazon, MAP[p.id], p.id);
});

test('the mapped hrefs are the 13 recorded Block 34 URLs, each used once', () => {
  const cfg = JSON.parse(fs.readFileSync('qa/qa.config.json', 'utf8'));
  const mapped = Object.values(MAP).flatMap((m) => Object.values(m));
  assert.equal(mapped.length, 13);
  assert.deepEqual([...mapped].sort(), [...cfg.commerceInventory.pages['/products/'].amazon].sort());
});

test('a "still" Amazon href is only allowed on products that offer the still style', () => {
  for (const p of loadProducts()) if (p.links?.amazon?.still) assert.ok(p.styles?.includes('still'), p.id);
});

test('Issue #165: retail vanilla uses the verified store href; vanilla-nitro-main stays wholesale-only; no Amazon link', () => {
  const VANILLA = 'https://www.nitrocoffee.store/products/peoples-organic-nitro-vanilla-pet-5-gal';
  const byId = (id) => loadProducts().find((x) => x.id === id);
  for (const id of ['vanilla-coffee', 'vanilla-nitro-main']) {
    assert.equal(byId(id).links.amazon, undefined, id);
    assert.equal(byId(id).links.store, VANILLA, id);
  }
  assert.equal(byId('vanilla-coffee').links.storeViews, undefined);
  assert.deepEqual(byId('vanilla-nitro-main').links.storeViews, ['wholesale']);
});

t('/products/ renders the 13 Amazon hrefs in document order; no other page renders any', () => {
  const r = hrefs('dist/products/index.html').filter((h) => /amazon/i.test(h));
  assert.deepEqual(r, Object.values(MAP).flatMap((m) => [m.nitro, m.still].filter(Boolean)));
  assert.ok(!hrefs('dist/products-2/index.html').some((h) => /amazon|amzn/i.test(h)));
});

t('strict QA blockers: 41 (Block 35 left 40; Block 63 adds 2 content-missing findings and clears 1 scaffold); no Amazon finding remains', () => {
  const strict = runQa({ ...loadInputs(), distDir: 'dist', mode: 'strict' });
  assert.equal(strict.blocking.length, 41);
  assert.ok(!strict.findings.some((f) => f.path === '/products/' && /amazon|commerce-destination-missing/.test(f.code)));
});
