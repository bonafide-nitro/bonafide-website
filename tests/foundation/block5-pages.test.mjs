// Block 5 (Issue #27): the six Batch-2 pages, checked against the built dist/ (run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { vocabOrAbsentInExport } from './block63-helper.mjs';

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
  // Block 63: present, or absent from the exact export text of the same route (never silently dropped).
  assert.deepEqual(vocabOrAbsentInExport(page('/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/'), 'healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy', ['is nitro cold brew bad for you']), []);
  const b = page('/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/');
  assert.deepEqual(vocabOrAbsentInExport(b, 'cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs', ['bag in box coffee', 'boxed cold brew', 'coffee concentrate', 'fridge', 'wholesale']), []); // Block 63: present, or absent from the exact export text
  const a = page('/about/');
  for (const s of ['2015', 'Craft Draft', 'John Goerke', 'Spencer Weiner', '10,000+', 'Core Values']) assert.ok(a.includes(s), s);
  // Block 63: headings and the Ventura line are the exact export wording (upper-case headings, "Ventura CA"); present, or absent from the exact export text.
  assert.deepEqual(vocabOrAbsentInExport(a, 'about', ['Ventura, CA', 'Who We Are', 'What We Do', 'Where Do We Fit', 'Our Team', 'Our Facilities']), []);
});

t('scaffold marker kept on all six (image binaries outstanding); no unproven upload path referenced (QA T7)', () => {
  for (const p of Object.keys(CONTRACT)) {
    const h = page(p);
    assert.ok(h.includes('scaffold-placeholder'), p);
    for (const u of hrefs(h)) if (u.startsWith('/wp-content/uploads/')) assert.ok(fs.existsSync(`public${u}`), u);
    if (p !== '/kegerators/' && p !== '/nitro-cold-brew/') assert.ok(!/<img\b/.test(h), `${p}: no <img> until binaries exist`);
  }
});

t('/kegerators/: exactly the five pinned originals, alt="" (no invented alt), bytes intact (Blocks 50, 52)', () => {
  const h = page('/kegerators/');
  const pinned = {
    '/wp-content/uploads/2018/06/Kegerator-counter-top-Bona-Fide.jpg': 'a837fd44d76ba484db9f3cb1bf8adefd2b96d80a53b2b9dac3c98541162f7876',
    '/wp-content/uploads/2018/06/Bona-Fide-Cold-Dispenser-countertop-small-min-1.png': '84d92129106de5d620926f94013b07f755a7fc0c4433d5af4cd38d64fec35198',
    '/wp-content/uploads/2019/08/Bona-Fide-Cold-doble-tap-nitro-machine-compressed.png': '0ca712d0dcb01444476e4c758a3d4c5234c19328cda440630287b591c619f0b6',
    '/wp-content/uploads/2019/05/NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed.png': 'd2c4ac44782ca84b205322e43509df29be1e94389f8fe126ad659bc8ce488b02',
    '/wp-content/uploads/2022/10/Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png': 'e796c7f86db98412a545d54e2e4219d39c819f31fc9a5e95f4586ce97d13ea85',
  };
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((x) => !/site-logo/.test(x));
  assert.equal(imgs.length, 5);
  assert.deepEqual(imgs.map((x) => x.match(/src="([^"]+)"/)[1]).sort(), Object.keys(pinned).sort());
  for (const x of imgs) assert.ok(/\balt=""/.test(x), 'alt must stay empty: no historical alt is preserved');
  for (const [u, sha] of Object.entries(pinned)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`public${u}`)).digest('hex'), sha, u);
  }
  assert.ok(h.includes('scaffold-placeholder'));
  assert.ok(!/Block-49|renders?\//i.test(h), 'Block 49 renders must not be placed');
});

t('/nitro-cold-brew/: exactly the six pinned originals, alt="" (no invented alt), bytes intact, missing Cold-brew-Nitro-Coffee.jpg not referenced (Block 53)', () => {
  const h = page('/nitro-cold-brew/');
  const pinned = {
    '/wp-content/uploads/2018/06/All-about-nitro-cold-brew-coffee.jpg': [188946, '01474a0f78e81755cd1f6f3347ad65ca64c29061ff903a0dce348e98cd774970'],
    '/wp-content/uploads/2021/10/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap.jpg': [145686, '9a6c00f4e9512a73109416daae014ee2b2c1553db87ac335d0176845bd664aa2'],
    '/wp-content/uploads/2023/03/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-1.jpg': [237416, '5e9054653036aefe2c523a0052d0750c9351bec5afe50aa1c6e5b81651e75f64'],
    '/wp-content/uploads/2023/03/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap-PET-Keg.jpg': [274186, 'd8d763e80436323d0cc55a6f88487b9e7453784f9dd599f397e2545ae7185436'],
    '/wp-content/uploads/2018/06/Kegerator-counter-top-Bona-Fide.jpg': [212930, 'a837fd44d76ba484db9f3cb1bf8adefd2b96d80a53b2b9dac3c98541162f7876'],
    '/wp-content/uploads/2018/06/Bona-Fide-Cold-Dispenser-countertop-small-min-1.png': [86246, '84d92129106de5d620926f94013b07f755a7fc0c4433d5af4cd38d64fec35198'],
  };
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((x) => !/site-logo/.test(x));
  assert.equal(imgs.length, 6);
  assert.deepEqual(imgs.map((x) => x.match(/src="([^"]+)"/)[1]).sort(), Object.keys(pinned).sort());
  for (const x of imgs) assert.ok(/\balt=""/.test(x), 'alt must stay empty: no historical alt is preserved');
  for (const [u, [size, sha]] of Object.entries(pinned)) {
    const b = fs.readFileSync(`public${u}`);
    assert.equal(b.length, size, u);
    assert.equal(crypto.createHash('sha256').update(b).digest('hex'), sha, u);
  }
  assert.ok(!/(?:src|href)="[^"]*Cold-brew-Nitro-Coffee/.test(h), 'binary absent from the repo: must not be referenced');
  assert.ok(!/Block-49|renders?\//i.test(h), 'Block 49 renders must not be placed');
  assert.ok(!/<figcaption/.test(h));
  assert.ok(h.includes('scaffold-placeholder'));
});

t('/about/ gallery stays blocked: no facilities image references until order/variants/alt are evidenced (Block 48)', () => {
  const h = page('/about/');
  assert.ok(!/<img\b/i.test(h) && !/href="[^"]*Bona-Fide-Facilities/i.test(h));
  const doc = fs.readFileSync('docs/migration/43-block47-facilities-import-gate.md', 'utf8');
  assert.ok(/merged to `main` in #111/.test(doc));
  assert.ok(!/NOT yet contained/.test(doc));
});
