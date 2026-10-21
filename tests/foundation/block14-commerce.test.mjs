// Block 14 (Issue #46): centralized external commerce links. The expected sets below are the exact
// commerce hrefs (nitrocoffee.store / Amazon) rendered per page BEFORE centralization, deduplicated
// per page. Centralizing must not change, add or drop any of them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCommerce, loadNavigation, loadProducts, loadRedirects } from '../../src/lib/data.mjs';
import { commerceHref } from '../../src/lib/commerce.mjs';
import { runQa } from '../../qa/checks.mjs';
import { loadInputs } from '../../qa/cli.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const commerceHrefs = (html) => [...new Set([...html.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => /nitrocoffee\.store|amazon|amzn/i.test(u)))];

const EXPECTED = {
  '/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/': [
    'https://www.nitrocoffee.store/',
  ],
  '/404.html': [
    'https://www.nitrocoffee.store/',
  ],
  '/a-touch-of-vanilla-to-your-nitro-coffee/': [
    'https://www.nitrocoffee.store/',
  ],
  '/about/': [
    'https://www.nitrocoffee.store/',
  ],
  '/author/admin/': [
    'https://www.nitrocoffee.store/',
  ],
  '/author/admin/page/2/': [
    'https://www.nitrocoffee.store/',
  ],
  '/blog/': [
    'https://www.nitrocoffee.store/',
  ],
  '/blog/page/2/': [
    'https://www.nitrocoffee.store/',
  ],
  '/book-appointment/': [
    'https://www.nitrocoffee.store/',
  ],
  '/category/news-nitro-coffee-and-nitro-tea/': [
    'https://www.nitrocoffee.store/',
  ],
  '/category/news-nitro-coffee-and-nitro-tea/page/2/': [
    'https://www.nitrocoffee.store/',
  ],
  '/coffee-doesnt-produce-cancer-says-leading-american-scientist/': [
    'https://www.nitrocoffee.store/',
  ],
  '/coffee-on-tap-is-the-future/': [
    'https://www.nitrocoffee.store/',
  ],
  '/coffee-trends-dominate-2018/': [
    'https://www.nitrocoffee.store/',
  ],
  '/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/': [
    'https://www.nitrocoffee.store/',
  ],
  '/contact-bona-fide-nitro-coffee-and-tea/': [
    'https://www.nitrocoffee.store/',
  ],
  '/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/': [
    'https://www.nitrocoffee.store/',
  ],
  '/hot-nitro-coffee/': [
    'https://www.nitrocoffee.store/',
  ],
  '/hot-nitro-equipment-rental/': [
    'https://www.nitrocoffee.store/',
  ],
  '/how-ambient-stable-coffee-kegs-help-you-save-more-money/': [
    'https://www.nitrocoffee.store/',
  ],
  '/howtobuy/': [
    'https://www.nitrocoffee.store/',
    'https://nitrocoffee.store/', // Block 63: the 2026-10-19 export links the e-shop image to the apex store root (registry id webstore-root-apex)
  ],
  '/': [
    'https://www.nitrocoffee.store/',
    'https://nitrocoffee.store/',
  ],
  '/interested-in-selling-eu-and-usa/': [
    'https://www.nitrocoffee.store/',
  ],
  '/interested-in-selling-eu-qr-2/': [
    'https://www.nitrocoffee.store/',
  ],
  '/interested-in-selling-usa/': [
    'https://www.nitrocoffee.store/',
  ],
  '/is-coffee-healthy/': [
    'https://www.nitrocoffee.store/',
  ],
  '/kegerators/': [
    'https://www.nitrocoffee.store/',
    // starter-kit href is knownDead (Issue #160): evidence only in commerce.yaml, never rendered as a link
    'https://www.nitrocoffee.store/collections/dispensers/products/double-faucet-countertop-flash-chiller-w-compressor',
    'https://www.nitrocoffee.store/collections/dispensers/products/selbach-hot-nitro-dispenser-w-2-faucets',
  ],
  '/nitro-coffee-future/': [
    'https://www.nitrocoffee.store/',
  ],
  '/nitro-coffee-health-benefits/': [
    'https://www.nitrocoffee.store/',
  ],
  '/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/': [
    'https://www.nitrocoffee.store/',
  ],
  '/nitro-coffee-kegs/': [
    'https://www.nitrocoffee.store/',
  ],
  '/nitro-coffee-questions/': [
    'https://www.nitrocoffee.store/',
  ],
  '/nitro-cold-brew-coffee-made-easy-2/': [
    'https://www.nitrocoffee.store/',
  ],
  '/nitro-cold-brew-old/': [
    'https://www.nitrocoffee.store/',
  ],
  '/nitro-cold-brew/': [
    'https://www.nitrocoffee.store/',
  ],
  '/privacy-policies/': [
    'https://www.nitrocoffee.store/',
  ],
  '/products-2/': [
    'https://www.nitrocoffee.store/',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/hair-raiser%C2%AE-organic-nitro-coffee',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/organic-espresso-nitro-pet-5-gal-1',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/organic-ethiopia-yirgacheffe-nitro-coffee-5-gal-pet-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/organic-peru-nitro-coffee-5-gal-pet-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/guatemala-organic-nitro-coffee',
    'https://www.nitrocoffee.store/products/peoples-organic-nitro-vanilla-pet-5-gal',
    'https://www.nitrocoffee.store/collections/nitro-tea/products/organic-hibiscus-nitro-tea',
    'https://www.nitrocoffee.store/collections/nitro-tea/products/mango-nitro-tea',
    'https://www.nitrocoffee.store/collections/nitro-tea/products/organic-passion-fruit-nitro-tea-pet-5-gal',
    'https://www.nitrocoffee.store/products/orgainc-nitro-hazelnut-creme-coffee-pet-5-gal-keg',
    'https://www.nitrocoffee.store/collections/pet-nitro-coffee-keg/products/organic-nitro-caramel-coffee-pet-5-gal-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/caveman-organic-guatemala-pet-5-gal-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/girls-run-the-world-coffee-nitro-pet-5-gal-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/jittery-johns-coffee-company-nitro-pet-5-gal-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/thai-treasure-coffee-nitro-pet-5-gal-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/cult-artisan-beverage-co-uganda-white-nile-nitro-pet-5-gal-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/thanksgiving-coffee-compnay-nitro-pet-5-gal-keg',
  ],
  '/products/': [
    'https://www.nitrocoffee.store/',
    'https://nitrocoffee.store/',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/hair-raiser%C2%AE-organic-nitro-coffee',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/organic-espresso-nitro-pet-5-gal-1',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/organic-ethiopia-yirgacheffe-nitro-coffee-5-gal-pet-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/organic-peru-nitro-coffee-5-gal-pet-keg',
    'https://www.nitrocoffee.store/collections/nitro-coffee/products/guatemala-organic-nitro-coffee',
    'https://www.nitrocoffee.store/collections/nitro-tea/products/organic-hibiscus-nitro-tea',
    'https://www.nitrocoffee.store/collections/nitro-tea/products/mango-nitro-tea',
    'https://www.nitrocoffee.store/collections/nitro-tea/products/organic-passion-fruit-nitro-tea-pet-5-gal',
    'https://www.nitrocoffee.store/collections/better-than-cold-brew-bag-in-box-coffee-and-tea-collection',
    'https://www.nitrocoffee.store/products/orgainc-nitro-hazelnut-creme-coffee-pet-5-gal-keg',
    'https://www.nitrocoffee.store/collections/pet-nitro-coffee-keg/products/organic-nitro-caramel-coffee-pet-5-gal-keg',
    // Block 35 (Issue #88): the 13 Amazon hrefs, each proven to its product/style by the original /products/ page.
    'https://www.amazon.com/Bona-Craft-Draft-Nitro-Coffee/dp/B01N1001H9',
    'https://www.amazon.com/dp/B0BQN58DQR',
    'https://www.amazon.com/Nitro-Cold-Espresso-Coffee-Organic/dp/B0BQ7JCS18',
    'https://www.amazon.com/dp/B0BQJNJTVY',
    'https://www.amazon.com/dp/B073WMK2FL',
    'https://www.amazon.com/dp/B0BQN2SQ2M',
    'https://www.amazon.com/dp/B01NCV8CAE',
    'https://www.amazon.com/dp/B0BQN1P82W',
    'https://www.amazon.com/dp/B071J91343',
    'https://www.amazon.com/dp/B0BQN3876K',
    'https://www.amazon.com/Bona-Fide-Brewing-Company-Hibiscus/dp/B074JJ5CST',
    'https://www.amazon.com/dp/B0BQJNW91V',
    'https://www.amazon.com/dp/B0BQMZKWM1',
  ],
  '/stability-kegs-nitro-coffee/': [
    'https://www.nitrocoffee.store/',
  ],
  '/terms-of-service/': [
    'https://www.nitrocoffee.store/',
  ],
  '/what-is-nitro-cold-brew-coffee/': [
    'https://www.nitrocoffee.store/',
  ],
};

t('every page renders exactly its evidenced commerce hrefs (no more, no fewer, byte-for-byte)', () => {
  for (const f of walk('dist').filter((x) => x.endsWith('.html'))) {
    const p = f.replace(/^dist/, '').replace(/index\.html$/, '');
    assert.deepEqual(commerceHrefs(fs.readFileSync(f, 'utf8')).sort(), [...(EXPECTED[p] ?? [])].sort(), p);
  }
});

t('/products/ and /products-2/ keep distinct inventories and counts', () => {
  assert.equal(EXPECTED['/products/'].length, 26); // 13 store + 13 Amazon (Block 35)
  assert.equal(EXPECTED['/products-2/'].length, 18); // Block 34: +6 Alliance hrefs
  assert.notDeepEqual([...EXPECTED['/products/']].sort(), [...EXPECTED['/products-2/']].sort());
  assert.ok(!commerceHrefs(fs.readFileSync('dist/products-2/index.html', 'utf8')).some((u) => /amazon|amzn/i.test(u)));
});

t('Amazon hrefs are rendered only on /products/ (Block 35)', () => {
  for (const f of walk('dist').filter((x) => x.endsWith('.html'))) {
    const has = /href="[^"]*(amazon\.|amzn\.)/i.test(fs.readFileSync(f, 'utf8'));
    assert.equal(has, f === path.join('dist', 'products', 'index.html'), f);
  }
});

t('every rendered commerce href is https on the approved store host', () => {
  for (const hs of Object.values(EXPECTED)) for (const h of hs) {
    const u = new URL(h);
    assert.equal(u.protocol, 'https:');
    assert.ok(['nitrocoffee.store', 'www.nitrocoffee.store', 'www.amazon.com'].includes(u.hostname), h);
    assert.ok([...u.searchParams.keys()].every((k) => k === 'variant'), h);
  }
});

test('registry hrefs and product store hrefs are all covered by the evidenced set', () => {
  const evidenced = new Set(Object.values(EXPECTED).flat());
  const c = loadCommerce();
  for (const [id, l] of Object.entries(c.links)) if (!l.knownDead) assert.ok(evidenced.has(l.href), id); // knownDead hrefs are evidence-only (Issue #160)
  for (const p of loadProducts()) if (p.links?.store) assert.ok(evidenced.has(p.links.store), p.id);
  for (const p of loadProducts()) for (const h of Object.values(p.links?.amazon ?? {})) assert.ok(evidenced.has(h), p.id);
  assert.equal(commerceHref('webstore-root-www'), 'https://www.nitrocoffee.store/');
  assert.throws(() => commerceHref('not-registered'), /unknown commerce link id/);
});

test('unresolved destinations are metadata only: no href, and they are never invented', () => {
  const c = loadCommerce();
  assert.ok(c.unresolved.length >= 3);
  for (const u of c.unresolved) assert.ok(!('href' in u), u.id);
  assert.ok(!c.unresolved.some((u) => u.id === 'products-amazon'), 'Block 35 resolved the Amazon register entry');
});

test('commerce schema rejects http, foreign hosts, tracking parameters, fragments and unresolved hrefs', async () => {
  const { default: YAML } = await import('yaml');
  const src = fs.readFileSync('src/data/commerce.yaml', 'utf8');
  const doc = YAML.parse(src);
  const bad = (href) => ({ ...doc, links: { x: { href, label: 'x' } } });
  // re-use the loader's schema by writing temp data into a scratch cwd
  const { spawnSync } = await import('node:child_process');
  const run = (d) => spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { loadCommerce } from ${JSON.stringify(path.resolve('src/lib/data.mjs'))};
    try { loadCommerce(); console.log('OK'); } catch { console.log('REJECT'); }`], { cwd: (() => {
      const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'b14-'));
      fs.mkdirSync(path.join(dir, 'src/data'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'src/data/commerce.yaml'), YAML.stringify(d));
      return dir;
    })(), encoding: 'utf8', env: { ...process.env, NODE_PATH: path.resolve('node_modules') } }).stdout.trim();
  assert.equal(run(doc), 'OK');
  for (const h of ['http://www.nitrocoffee.store/', 'https://nitrocoffee.store.evil.com/', 'https://www.amazon.com/dp/x', 'https://www.nitrocoffee.store/?utm_source=a', 'https://www.nitrocoffee.store/?ref=aff', 'https://www.nitrocoffee.store/#frag']) assert.equal(run(bad(h)), 'REJECT', h);
  assert.equal(run({ ...doc, unresolved: [{ ...doc.unresolved[0], href: 'https://www.nitrocoffee.store/' }] }), 'REJECT');
});

t('unresolved redirect fragments never become live hrefs or visible store URLs', () => {
  const pending = loadRedirects().filter((r) => r.state !== 'defined' && r.evidenceFragment);
  assert.deepEqual(pending.map((r) => r.id).sort(), ['svc-cascara', 'svc-green-citrus']); // Block 22: the other 6 truncated fragments resolved to `defined`; these 2 are `deliberate-404`
  const all = walk('dist').filter((x) => x.endsWith('.html')).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const r of pending) {
    const frag = r.evidenceFragment.replace(/…$/, '');
    assert.ok(!all.includes(frag), `fragment rendered: ${frag}`);
    assert.equal(r.to, null);
  }
  const reg = JSON.stringify(loadCommerce());
  for (const r of pending) assert.ok(!reg.includes(r.evidenceFragment.replace(/…$/, '')));
});

test('source: pages never hard-code a nitrocoffee.store href; they use the registry', () => {
  for (const f of walk('src/pages').filter((x) => x.endsWith('.astro'))) {
    assert.ok(!/href="https?:\/\/(www\.)?nitrocoffee\.store/.test(fs.readFileSync(f, 'utf8')), f);
  }
  assert.ok(!/nitrocoffee\.store/.test(fs.readFileSync('src/components/ProductCard.astro', 'utf8')));
});

t('strict QA still reports the unresolved commerce inventory; foundation has 0 invariants', () => {
  const inputs = loadInputs();
  const foundation = runQa({ ...inputs, distDir: 'dist', mode: 'foundation' });
  assert.equal(foundation.blocking.length, 0, JSON.stringify(foundation.blocking));
  assert.equal(foundation.passed, true);
  const strict = runQa({ ...inputs, distDir: 'dist', mode: 'strict' });
  assert.equal(strict.passed, false);
  const codes = strict.findings.map((f) => f.code ?? f.rule ?? JSON.stringify(f)).join(' ');
  for (const code of ['commerce-inventory-missing', 'store-links-min']) assert.ok(codes.includes(code), code);
  assert.ok(foundation.migrationRemaining.length > 0);
});

test('global Store nav link is sourced from validated commerce data', () => {
  const nav = loadNavigation();
  assert.ok(nav.external.length > 0);
  for (const i of nav.external) {
    assert.equal(i.href, undefined, 'navigation carries no inline href');
    assert.ok(loadCommerce().links[i.commerceId], `nav commerce id ${i.commerceId} is registered`);
  }
  assert.deepEqual(nav.external.map((i) => [i.commerceId, i.label]), [['webstore-root-www', 'Store']]);
  assert.equal(commerceHref('webstore-root-www'), 'https://www.nitrocoffee.store/');
});

t('rendered global Store nav link is byte-identical on every page', () => {
  const pages = walk('dist').filter((f) => f.endsWith('.html'));
  assert.ok(pages.length > 0);
  for (const f of pages) {
    const nav = fs.readFileSync(f, 'utf8').match(/<nav class="site"[\s\S]*?<\/nav>/);
    assert.ok(nav && /<a href="https:\/\/www\.nitrocoffee\.store\/"[^>]*>Store<\/a>/.test(nav[0]), `${f}: Store nav href`);
  }
});
