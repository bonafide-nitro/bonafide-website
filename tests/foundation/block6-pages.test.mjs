// Block 6 (Issue #30): the six Batch-3 pages, checked against the built dist/ (run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { POSTS } from '../../src/lib/article-schema.mjs';
const POST_PATHS = new Set(POSTS.map((x) => x.path));

const page = (p) => fs.readFileSync(`dist${p}index.html`, 'utf8');
const dec = (s) => s.replace(/&#38;|&amp;/g, '&').replace(/&#34;|&quot;/g, '"');
const title = (h) => dec(h.match(/<title>([^<]*)<\/title>/)[1]);
const h1s = (h) => [...h.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((m) => dec(m[1]));
const canonical = (h) => h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const hrefs = (h) => [...h.matchAll(/href="([^"]+)"/g)].map((m) => dec(m[1]));
const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);

// [title, evidenced H1 or null when the historical H1 is not evidenced]
const CONTRACT = {
  '/contact-bona-fide-nitro-coffee-and-tea/': ['Contact - Bona Fide Nitro Coffee And Tea', 'Contact'],
  '/coffee-on-tap-is-the-future/': ['COFFEE “ON TAP” IS THE FUTURE - Bona Fide Nitro Coffee', 'COFFEE “ON TAP” IS THE FUTURE'],
  '/nitro-coffee-kegs/': ['Nitro Coffee Kegs - Bona Fide Nitro Coffee & Tea Experts', 'Nitro Coffee Kegs'],
  '/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/': ['3 Cups of Coffee a Day: Why It Can Be Good for the Health', '3 Cups of Coffee a Day: Why It Can Be Good for the Health'],
  '/nitro-coffee-questions/': ['Nitro Coffee Bona Fide| FAQ| Find the right answer', null],
  '/hot-nitro-equipment-rental/': ['Hot Nitro Equipment For Rent in EU - Bona Fide Nitro Coffee', null],
};

for (const [p, [ti, h1]] of Object.entries(CONTRACT)) {
  t(`${p}: exact launch title, one H1, self-canonical, indexable, no scripts`, () => {
    const h = page(p);
    assert.equal(title(h), ti);
    const found = h1s(h);
    assert.equal(found.length, 1);
    if (h1) assert.equal(found[0], h1);
    assert.equal(canonical(h), `https://bonafidenitro.com${p}`);
    assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(h), 'only JSON-LD script allowed');
    assert.ok(!/quickdelivr|coredelivr|mpackage|thrive|sydney/i.test(h));
    assert.ok(!/<form\b/i.test(h) || /<form[^>]*method="post"/i.test(h), 'any form is POST (Block 11 adds the Stage-7 form)');
    assert.ok(!h.includes('noindex'));
    assert.ok(!hrefs(h).some((x) => x.includes('products-2')), 'no link to /products-2/');
  });
}

t('Organization + WebSite + BreadcrumbList JSON-LD on all six pages', () => {
  for (const p of Object.keys(CONTRACT)) {
    const m = page(p).match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    const types = JSON.parse(m[1])['@graph'].map((n) => n['@type']);
    for (const ty of ['Organization', 'WebSite', 'BreadcrumbList']) assert.ok(types.includes(ty), `${p} ${ty}`);
    assert.ok(!types.includes('FAQPage'), `${p}: no unevidenced FAQ schema`);
    assert.equal(types.includes('Article'), POST_PATHS.has(p), `${p}: Article only on historical posts (Block 23)`);
  }
});

t('/contact-…/: evidenced details, no fake endpoint', () => {
  const h = page('/contact-bona-fide-nitro-coffee-and-tea/');
  for (const s of ['3020 Sherwin Ave Suite D', 'Ventura, CA 93003', '855-482-1446', 'contact@bonafidenitro.com', 'consumer', 'distributor', 'retailer', 'co-packer']) assert.ok(h.toLowerCase().includes(s.toLowerCase()), s);
  assert.ok(hrefs(h).includes('https://www.nitrocoffee.store/'));
});

t('vocabulary preserved', () => {
  const tap = page('/coffee-on-tap-is-the-future/');
  for (const s of ['coffee on tap', 'John Goerke', 'shelf stable']) assert.ok(tap.toLowerCase().includes(s.toLowerCase()), s);
  const kegs = page('/nitro-coffee-kegs/');
  for (const s of ['PET', 'Sankey D', 'stainless steel', 'single-use', 'tamper', 'Craft Draft', 'pasteurization', 'ready-to-tap']) assert.ok(kegs.includes(s), s);
  const cups = page('/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/').toLowerCase();
  for (const s of ['3 cups of coffee', 'is 3 cups of coffee too much', 'moderation', 'caffeine', 'calorie', 'sleep']) assert.ok(cups.includes(s), s);
  const faq = page('/nitro-coffee-questions/').toLowerCase();
  for (const s of ['shelf life', 'refrigeration', 'nitro tea', 'flavored', 'pallet', 'co-brand', 'alliance']) assert.ok(faq.includes(s), s);
  const rent = page('/hot-nitro-equipment-rental/');
  for (const s of ['EU', 'EUR', '180-day', 'plug', 'proprietary']) assert.ok(rent.includes(s), s);
});

t('scaffold marker kept on all six; no unproven upload path, no invented PDF/image/link', () => {
  for (const p of Object.keys(CONTRACT)) {
    const h = page(p);
    assert.ok(h.includes('scaffold-placeholder'), p);
    for (const u of hrefs(h)) if (u.startsWith('/wp-content/uploads/')) assert.ok(fs.existsSync(`public${u}`), u);
    assert.ok(!/<img\b/.test(h), `${p}: no <img> until binaries exist`);
    assert.ok(!/\.pdf/i.test(h), `${p}: no PDF link until an exact path is evidenced`);
  }
});
