// Block 4 (Issue #25): the four Batch-1 pages, checked against the built dist/ (run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProducts } from '../../src/lib/data.mjs';
import { productsForView } from '../../src/lib/products.mjs';

const page = (p) => fs.readFileSync(`dist${p}index.html`, 'utf8');
const title = (h) => h.match(/<title>([^<]*)<\/title>/)[1];
const h1s = (h) => [...h.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((m) => m[1]);
const canonical = (h) => h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const hrefs = (h) => [...h.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replaceAll('&#38;', '&'));
const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);

const CONTRACT = {
  '/': ['Nitro Coffee Experts & Leaders - Bona Fide Nitro Coffee & Nitro Tea', 'BONA FIDE - EXPERTS IN NITRO COFFEE AND NITRO TEA'],
  '/products/': ['Cold Brew Nitro Coffee Kegs - Bona Fide Nitro Coffee and Tea', 'Best Nitro Cold Brew Coffee Kegs On The Market'],
  '/products-2/': ['Cold Brew Nitro Coffee Kegs - Bona Fide Nitro Coffee and Tea', 'Best Nitro Cold Brew Coffee Kegs on the Market'],
  '/howtobuy/': ['Nitro Office Coffee Distributor - Bona Fide Nitro Coffee and Tea', 'Nitro Coffee Distributors and Wholesale Coffee Keg Suppliers'],
};

for (const [p, [ti, h1]] of Object.entries(CONTRACT)) {
  t(`${p}: exact launch title/H1, one self-canonical, no forbidden hosts`, () => {
    const h = page(p);
    assert.equal(title(h).replace(/&#38;|&amp;/g, '&'), ti);
    assert.deepEqual(h1s(h).map((x) => x.replace(/&#38;|&amp;/g, '&')), [h1]);
    assert.equal(canonical(h), `https://bonafidenitro.com${p}`);
    assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(h), 'only JSON-LD script allowed');
    assert.ok(!/quickdelivr|coredelivr|mpackage/.test(h));
    assert.ok(!h.includes('noindex'));
  });
}

t('scaffold marker: kept on /, /howtobuy/ and the two product pages', () => {
  assert.ok(page('/').includes('scaffold-placeholder'));
  assert.ok(page('/howtobuy/').includes('scaffold-placeholder'));
  assert.ok(page('/products/').includes('scaffold-placeholder'));
  assert.ok(page('/products-2/').includes('scaffold-placeholder'));
});

t('/products/ and /products-2/ are distinct; wholesale-only and retail-only content does not leak', () => {
  const r = page('/products/'), w = page('/products-2/');
  assert.notEqual(r, w);
  for (const s of ['Caveman Coffee Company Nitro', 'Direct Distribution Program', 'direct-store-delivery (DSD)', '$195.00', '120 days', 'Alliance Brand Nitro Coffee']) {
    assert.ok(w.includes(s), `wholesale missing ${s}`);
    assert.ok(!r.includes(s), `retail leaks ${s}`);
  }
  for (const s of ['Nitro Style', 'Still (Flat) Style', 'Bag In Box', 'Are You Looking For Dispensing Equipment?', '180+ Days Shelf Stable Kegs', '$149.00', 'Buy Securely On Amazon.com']) {
    assert.ok(r.includes(s), `retail missing ${s}`);
    assert.ok(!w.includes(s), `wholesale leaks ${s}`);
  }
});

t('/products-2/: no Amazon, no link from any other page, 19 price blocks, 6 alliance products', () => {
  const w = page('/products-2/');
  assert.ok(!hrefs(w).some((h) => /amazon|amzn/i.test(h)));
  assert.equal([...w.matchAll(/class="price"/g)].length, 19);
  for (const p of ['/', '/products/', '/howtobuy/']) assert.ok(!hrefs(page(p)).some((h) => h.includes('products-2')), p);
  assert.equal(productsForView(loadProducts(), 'wholesale').filter((x) => x.line === 'alliance').length, 6);
});

t('retail view: 12 SKUs; retail never renders alliance; no invented Amazon hrefs', () => {
  const items = productsForView(loadProducts(), 'retail');
  assert.equal(items.length, 12);
  assert.ok(items.every((p) => p.line !== 'alliance'));
  assert.ok(!hrefs(page('/products/')).some((h) => /amazon|amzn/i.test(h)));
});

t('no page references an /wp-content/uploads/ path whose binary is not in the repo (QA T7)', () => {
  for (const p of Object.keys(CONTRACT)) {
    for (const h of hrefs(page(p))) if (h.startsWith('/wp-content/uploads/')) assert.ok(fs.existsSync(`public${h}`), h);
  }
});

t('Organization + WebSite + BreadcrumbList JSON-LD on all four pages', () => {
  for (const p of Object.keys(CONTRACT)) {
    const m = page(p).match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    const types = JSON.parse(m[1])['@graph'].map((n) => n['@type']);
    for (const ty of ['Organization', 'WebSite', 'BreadcrumbList']) assert.ok(types.includes(ty), `${p} ${ty}`);
  }
});
