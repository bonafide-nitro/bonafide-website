// Block 5 (Issue #27): the six Batch-2 pages, checked against the built dist/ (run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Block 41: the shared header logo is sitewide chrome, not page body content.
const page = (p) => fs.readFileSync(`dist${p}index.html`, 'utf8').replace(/<header id="masthead"[\s\S]*?<\/header>/, '');
const dec = (s) => s.replace(/&#38;|&amp;/g, '&');
const title = (h) => dec(h.match(/<title>([^<]*)<\/title>/)[1]);
const h1s = (h) => [...h.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((m) => dec(m[1]));
const canonical = (h) => h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const hrefs = (h) => [...h.matchAll(/href="([^"]+)"/g)].map((m) => dec(m[1]));
const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);

const CONTRACT = {
  '/kegerators/': ['Kegerators - Bona Fide Nitro Coffee', 'Equipment to Serve Nitro Cold Brew Coffee'],
  '/nitro-cold-brew/': ['Nitro Cold Brew - Bona Fide Brewing Company - Nitro Coffee Experts', 'ALL ABOUT NITRO COLD BREW COFFEE'],
  '/hot-nitro-coffee/': ['Hot Nitro Coffee - Bona Fide Nitro Coffee', 'Hot Nitro Coffee'],
  '/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/': ['Cold Brew Bag In Box Coffee - Bona Fide Nitro Coffee', 'Cold Brew Bag In Box Coffee'],
  '/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/': ['Nitro Coffee| Health and benefits of drinking Nitro Coffee| Bona Fide', 'HEALTHY BENEFITS OF DRINKING NITRO COFFEE, IS NITRO COFFEE HEALTHY?'],
  '/about/': ['Nitro Coffee Best Quality - Bona Fide Nitro Coffee Experts', 'Bona Fide Nitro Coffee and Tea'],
};

for (const [p, [ti, h1]] of Object.entries(CONTRACT)) {
  t(`${p}: exact launch title/H1, one self-canonical, indexable, no scripts`, () => {
    const h = page(p);
    assert.equal(title(h), ti);
    assert.deepEqual(h1s(h), [h1]);
    assert.equal(canonical(h), `https://bonafidenitro.com${p}`);
    assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(h), 'only JSON-LD script allowed');
    assert.ok(!/quickdelivr|coredelivr|mpackage|thrive|sydney/i.test(h));
    assert.ok(!h.includes('noindex'));
    assert.ok(!hrefs(h).some((x) => x.includes('products-2')), 'no link to /products-2/');
  });
}

t('Organization + WebSite + BreadcrumbList JSON-LD on all six pages', () => {
  for (const p of Object.keys(CONTRACT)) {
    const m = page(p).match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    const types = JSON.parse(m[1])['@graph'].map((n) => n['@type']);
    for (const ty of ['Organization', 'WebSite', 'BreadcrumbList']) assert.ok(types.includes(ty), `${p} ${ty}`);
  }
});

t('/kegerators/: exact observed store destinations, four equipment groups', () => {
  const h = page('/kegerators/');
  const l = hrefs(h);
  for (const u of [
    'https://www.nitrocoffee.store/products/plug-play-cafe-starter-kit-countertop-flash-chiller-w-compressor-bik-compatible?variant=41629884055715',
    'https://www.nitrocoffee.store/collections/dispensers/products/double-faucet-countertop-flash-chiller-w-compressor',
    'https://www.nitrocoffee.store/collections/dispensers/products/selbach-hot-nitro-dispenser-w-2-faucets',
  ]) assert.ok(l.includes(u), u);
  for (const s of ['Lindr', '110v', 'BIK', 'dispenser', 'machine', 'countertop', 'kegerator']) assert.ok(h.toLowerCase().includes(s.toLowerCase()), s);
});

t('vocabulary and entity content preserved', () => {
  assert.ok(/nitro coffee psi/i.test(page('/nitro-cold-brew/')) && /nitro coffee machine/i.test(page('/nitro-cold-brew/')));
  assert.ok(/is nitro cold brew bad for you/i.test(page('/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/')));
  const b = page('/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/');
  for (const s of ['bag in box coffee', 'boxed cold brew', 'coffee concentrate', 'fridge', 'wholesale']) assert.ok(b.toLowerCase().includes(s), s);
  const a = page('/about/');
  for (const s of ['2015', 'Craft Draft', 'John Goerke', 'Spencer Weiner', 'Ventura, CA', '10,000+', 'Who We Are', 'Core Values', 'What We Do', 'Where Do We Fit', 'Our Team', 'Our Facilities']) assert.ok(a.includes(s), s);
});

t('scaffold marker kept on all six (image binaries outstanding); no unproven upload path referenced (QA T7)', () => {
  for (const p of Object.keys(CONTRACT)) {
    const h = page(p);
    assert.ok(h.includes('scaffold-placeholder'), p);
    for (const u of hrefs(h)) if (u.startsWith('/wp-content/uploads/')) assert.ok(fs.existsSync(`public${u}`), u);
    assert.ok(!/<img\b/.test(h), `${p}: no <img> until binaries exist`);
  }
});

t('/about/ gallery stays blocked: no facilities image references until order/variants/alt are evidenced (Block 48)', () => {
  const h = page('/about/');
  assert.ok(!/<img\b/i.test(h) && !/href="[^"]*Bona-Fide-Facilities/i.test(h));
  const doc = fs.readFileSync('docs/migration/43-block47-facilities-import-gate.md', 'utf8');
  assert.ok(/merged to `main` in #111/.test(doc));
  assert.ok(!/NOT yet contained/.test(doc));
});
