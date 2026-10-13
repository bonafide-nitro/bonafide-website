// Block 9 (Issue #36): Tier-3 archives + /stability-kegs-nitro-coffee/, checked against the built dist/ (run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Block 41: the shared header logo is sitewide chrome, not page body content.
const page = (p) => fs.readFileSync(`dist${p}index.html`, 'utf8').replace(/<header id="masthead"[\s\S]*?<\/header>/, '');
const dec = (s) => s.replace(/&#38;|&amp;/g, '&').replace(/&#34;|&quot;/g, '"').replace(/&#39;|&#x27;/g, "'");
const title = (h) => dec(h.match(/<title>([^<]*)<\/title>/)[1]);
const h1s = (h) => [...h.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((m) => dec(m[1]));
const canonical = (h) => h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const cards = (h) => [...h.matchAll(/<li class="card">\s*<h2><a href="([^"]+)">([^<]*)<\/a><\/h2>/g)].map((m) => [m[1], dec(m[2])]);
const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);

const P1 = [
  ['/a-touch-of-vanilla-to-your-nitro-coffee/', 'A Touch of Vanilla to Your Nitro Coffee'],
  ['/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/', '3 Cups of Coffee a Day: Why It Can Be Good for the Health'],
  ['/how-ambient-stable-coffee-kegs-help-you-save-more-money/', 'How Ambient Stable Coffee Kegs Help You Save More Money'],
  ['/hot-nitro-coffee/', 'Hot Nitro Coffee'],
  ['/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/', 'Nitro Coffee in Time of COVID-19 Pandemic How Safe is it'],
  ['/what-is-nitro-cold-brew-coffee/', 'What is Nitro cold brew coffee'],
  ['/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/', 'Cold Brew Bag In Box Coffee'],
  ['/nitro-coffee-health-benefits/', 'NITRO COFFEE HEALTH BENEFITS'],
  ['/is-coffee-healthy/', 'IS COFFEE HEALTHY'],
  ['/coffee-trends-dominate-2018/', 'COFFEE TRENDS THAT WILL DOMINATE IN 2018'],
];
const P2 = [
  ['/coffee-doesnt-produce-cancer-says-leading-american-scientist/', '“COFFEE DOESN’T PRODUCE CANCER” says leading American Scientist'],
  ['/nitro-coffee-future/', 'NITRO COFFEE IS THE FUTURE'],
  ['/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/', 'HEALTHY BENEFITS OF DRINKING NITRO COFFEE, IS NITRO COFFEE HEALTHY?'],
  ['/stability-kegs-nitro-coffee/', 'STABILITY KEGS NITRO COFFEE'],
  ['/coffee-on-tap-is-the-future/', 'COFFEE “ON TAP” IS THE FUTURE'],
];
const CAT = '/category/news-nitro-coffee-and-nitro-tea/';
const ARCHIVES = [
  ['/blog/', P1, 'Nitro Coffee & Nitro Tea News'],
  ['/blog/page/2/', P2, 'Nitro Coffee & Nitro Tea News'],
  [CAT, P1, 'Category: News Nitro Coffee and Nitro Tea'],
  [`${CAT}page/2/`, P2, 'Category: News Nitro Coffee and Nitro Tea'],
  ['/author/admin/', P1, 'Author: John Goerke'],
  ['/author/admin/page/2/', P2, 'Author: John Goerke'],
];

for (const [p, list, h1] of ARCHIVES) {
  t(`${p}: exact evidenced listing/order, H1, self-canonical, indexable, static`, () => {
    const h = page(p);
    assert.deepEqual(cards(h), list);
    assert.deepEqual(h1s(h), [h1]);
    assert.equal(canonical(h), `https://bonafidenitro.com${p}`);
    assert.ok(!h.includes('noindex') && !/http-equiv="refresh"/i.test(h));
    assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(h), 'only JSON-LD script allowed');
    assert.ok(!/quickdelivr|coredelivr|mpackage|thrive|sydney/i.test(h));
    const types = JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'].map((n) => n['@type']);
    for (const ty of ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']) assert.ok(types.includes(ty), ty);
    assert.ok(!types.some((x) => /Article|FAQPage|ItemList/.test(x)));
  });
}

t('page 2 routes are real, distinct pages (not page-1 shells or redirects) with their own titles (except the evidenced /blog/ pair)', () => {
  for (const [a, b] of [['/blog/', '/blog/page/2/'], [CAT, `${CAT}page/2/`], ['/author/admin/', '/author/admin/page/2/']]) {
    assert.notEqual(page(a), page(b));
    // /blog/ and /blog/page/2/ share the evidenced live title (ZANETA_DECISION, titleUniquenessException pair).
    if (a === '/blog/') assert.equal(title(page(a)), title(page(b)));
    else assert.notEqual(title(page(a)), title(page(b)));
    assert.equal(cards(page(a)).length, 10);
    assert.equal(cards(page(b)).length, 5);
  }
  assert.equal(title(page('/blog/')), 'Nitro Coffee & Nitro Tea News | Bona Fide Brewing Company | Blog');
});

t('pagination: page 1 links page 2, page 2 links back and marks itself current', () => {
  for (const [a, b] of [['/blog/', '/blog/page/2/'], [CAT, `${CAT}page/2/`], ['/author/admin/', '/author/admin/page/2/']]) {
    const h1 = page(a), h2 = page(b);
    assert.ok(h1.includes(`<a href="${b}">2</a>`) && h1.includes('<span aria-current="page">1</span>'), a);
    assert.ok(h2.includes(`<a href="${a}">1</a>`) && h2.includes('<span aria-current="page">2</span>'), b);
  }
});

t('category intro is the evidenced sentence; no invented archive content', () => {
  for (const p of [CAT, `${CAT}page/2/`]) assert.ok(page(p).includes('We are attentive to all what is happening in the market of Nitro Coffee and Nitro Tea.'));
  for (const p of ['/blog/page/2/', '/author/admin/', '/author/admin/page/2/']) assert.ok(!page(p).includes('We are attentive'));
});

t('all archive links resolve to built pages (no broken internal link)', () => {
  for (const [p] of ARCHIVES) for (const m of page(p).matchAll(/href="(\/[^"]*)"/g)) assert.ok(fs.existsSync(`dist${m[1]}index.html`) || fs.existsSync(`dist${m[1]}`), `${p} -> ${m[1]}`);
});

t('/stability-kegs-nitro-coffee/: distinct static 200, exact title/H1, evidenced meta, conservative claims', () => {
  const h = page('/stability-kegs-nitro-coffee/');
  assert.equal(title(h), 'STABILITY KEGS NITRO COFFEE - Bona Fide Nitro Coffee');
  assert.deepEqual(h1s(h), ['STABILITY KEGS NITRO COFFEE']);
  assert.equal(canonical(h), 'https://bonafidenitro.com/stability-kegs-nitro-coffee/');
  assert.ok(!h.includes('noindex') && !/http-equiv="refresh"/i.test(h));
  for (const s of ['By John Goerke', 'datetime="2017-12-01"', 'datetime="2018-11-16"', 'News Nitro Coffee and Nitro Tea', 'historical article', 'shelf-stable', 'keg deposits', 'predictable cost of goods sold', 'tap and pour', 'no coffee preparation on site']) assert.ok(h.includes(s), s);
  assert.ok(!/\d\s?%|\$\s?\d|€|guarantee/i.test(h.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')), 'no invented price/GP figure or guarantee');
  assert.ok(!/<form\b|<img\b|<iframe/i.test(h));
});

t('/stability-kegs-nitro-coffee/ is a protected 200 and no longer a 301 source', () => {
  const b = JSON.parse(fs.readFileSync('src/data/seo-baseline.json', 'utf8')).urls.find((x) => x.path === '/stability-kegs-nitro-coffee/');
  assert.equal(b.expect, '200');
  assert.equal(b.canonical, 'self');
  assert.equal(b.inSitemap, true);
  assert.ok(!fs.readFileSync('src/data/redirects.yaml', 'utf8').includes('from: /stability-kegs-nitro-coffee/'));
});

t('Tier-3 baseline contracts for the five archive routes unchanged', () => {
  const urls = JSON.parse(fs.readFileSync('src/data/seo-baseline.json', 'utf8')).urls;
  for (const p of ['/blog/page/2/', CAT, `${CAT}page/2/`, '/author/admin/', '/author/admin/page/2/']) {
    const e = urls.find((x) => x.path === p);
    assert.deepEqual([e.tier, e.expect, e.canonical, e.indexable, e.inSitemap], [3, '200', 'self', true, true], p);
  }
});
