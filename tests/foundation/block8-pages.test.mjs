// Block 8 (Issue #34): seven remaining Tier-2 pages, checked against the built dist/ (run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { POSTS } from '../../src/lib/article-schema.mjs';
const POST_PATHS = new Set(POSTS.map((x) => x.path));

const page = (p) => fs.readFileSync(`dist${p}index.html`, 'utf8');
const dec = (s) => s.replace(/&#38;|&amp;/g, '&').replace(/&#34;|&quot;/g, '"').replace(/&#39;|&#x27;/g, "'");
const title = (h) => dec(h.match(/<title>([^<]*)<\/title>/)[1]);
const h1s = (h) => [...h.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((m) => dec(m[1]));
const canonical = (h) => h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const hrefs = (h) => [...h.matchAll(/href="([^"]+)"/g)].map((m) => dec(m[1]));
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);

const CONTRACT = {
  '/nitro-cold-brew-old/': ['Nitro Cold Brew - Bona Fide Brewing Company - Nitro Coffee Experts', 'ALL ABOUT NITRO COLD BREW COFFEE'],
  '/nitro-cold-brew-coffee-made-easy-2/': ['Simple Explain Nitro Cold Brew Coffee - Bona Fide Nitro Coffee', 'Simple Explain Nitro Cold Brew Coffee'],
  '/coffee-trends-dominate-2018/': ['Coffee trends that will dominate in 2018 | Bona Fide News', 'COFFEE TRENDS THAT WILL DOMINATE IN 2018'],
  '/coffee-doesnt-produce-cancer-says-leading-american-scientist/': ["Bona Fide Nitro Coffee & Nitro Tea | Coffee doesn't produce cancer", '“COFFEE DOESN’T PRODUCE CANCER” says leading American Scientist'],
  '/interested-in-selling-usa/': ['Interested In Selling In The USA - Bona Fide Nitro Coffee', 'Interested In Selling In The USA'],
  '/interested-in-selling-eu-and-usa/': ['Interested In Selling In EU And USA - Bona Fide Nitro Coffee', 'Interested In Selling In EU And USA'],
  '/interested-in-selling-eu-qr-2/': ['Interested In Selling In EU - Bona Fide Nitro Coffee', 'Interested In Selling In EU'],
};
const PATHS = Object.keys(CONTRACT);
const ARTICLES = ['/coffee-trends-dominate-2018/', '/coffee-doesnt-produce-cancer-says-leading-american-scientist/'];
const DATES = {
  '/coffee-trends-dominate-2018/': ['2018-03-22', '2018-11-16'],
  '/coffee-doesnt-produce-cancer-says-leading-american-scientist/': ['2018-02-13', '2018-11-16'],
};

for (const [p, [ti, h1]] of Object.entries(CONTRACT)) {
  t(`${p}: exact title/H1, one H1, self-canonical, indexable, no scripts/forms/embeds/img`, () => {
    const h = page(p);
    assert.equal(title(h), ti);
    assert.deepEqual(h1s(h), [h1]);
    assert.equal(canonical(h), `https://bonafidenitro.com${p}`);
    assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(h), 'only JSON-LD script allowed');
    assert.ok(!/quickdelivr|coredelivr|mpackage|thrive|sydney/i.test(h));
    assert.ok(!/<form\b|<input\b|<iframe|<video|<img\b|<button\b/i.test(h));
    assert.ok(!h.includes('noindex'));
    assert.ok(!hrefs(h).some((x) => x.includes('products-2')));
    assert.ok(!/docs\.google|calendly|youtube|\.pdf/i.test(h), 'no invented CTA/embed destination');
    assert.ok(h.includes('scaffold-placeholder'), 'scaffold kept (media/meta/CTA evidence outstanding)');
  });
}

t('Organization + WebSite + WebPage + BreadcrumbList JSON-LD; no unevidenced Article/FAQ schema', () => {
  for (const p of PATHS) {
    const m = page(p).match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    const types = JSON.parse(m[1])['@graph'].map((n) => n['@type']);
    for (const ty of ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']) assert.ok(types.includes(ty), `${p} ${ty}`);
    assert.ok(!types.some((x) => /VideoObject|FAQPage/.test(x)), p);
    assert.equal(types.includes('Article'), POST_PATHS.has(p), `${p}: Article only on historical posts (Block 23)`);
  }
});

t('/nitro-cold-brew-old/ stays distinct from /nitro-cold-brew/ (no canonical/redirect collapse)', () => {
  const old = page('/nitro-cold-brew-old/');
  assert.equal(canonical(old), 'https://bonafidenitro.com/nitro-cold-brew-old/');
  assert.ok(!/http-equiv="refresh"/i.test(old));
  assert.notEqual(old, page('/nitro-cold-brew/'));
});

t('made-easy: interactive behaviour is explicitly not presented as complete', () => {
  const h = page('/nitro-cold-brew-coffee-made-easy-2/');
  assert.ok(/not yet rebuilt/i.test(h));
  for (const s of ['If You Are a First Time Nitro / Cold Brew Consumer, Welcome!', 'What Is Nitro Coffee - Draft Cold Brew Coffee Dispense From Tap', 'nitrogen', 'draft tap']) assert.ok(dec(h).includes(s), s);
});

t('articles: author, evidenced dates, historical framing, no strengthened claims', () => {
  for (const p of ARTICLES) {
    const h = page(p);
    assert.ok(h.includes('By John Goerke'), p);
    const [o, u] = DATES[p];
    assert.ok(h.includes(`datetime="${o}"`) && h.includes(`datetime="${u}"`), p);
    assert.ok(h.includes('historical article'), p);
    assert.ok(hrefs(h).includes('/blog/'), p);
  }
  const trends = text(page('/coffee-trends-dominate-2018/'));
  for (const s of ['Millennials', 'Ready-to-drink', 'Nitro coffee on tap', 'Cold brew displacing iced coffee', 'specialty coffee']) assert.ok(trends.includes(s), s);
  const c = page('/coffee-doesnt-produce-cancer-says-leading-american-scientist/');
  assert.ok(c.includes('not medical advice'));
  for (const s of ['Proposition 65', 'acrylamide', 'Giovannucci']) assert.ok(c.includes(s), s);
  for (const p of [...ARTICLES, '/nitro-cold-brew-old/']) {
    assert.ok(!/\b(cures?|prevents?|treats?|proven|guarantee[sd]?)\b/i.test(text(page(p)).replace(/Coffee doesn’t produce cancer/gi, '')), `${p}: no strengthened claim words`);
  }
});

t('selling pages: B2B intent kept, CTA is a label only, no form endpoint', () => {
  for (const p of ['/interested-in-selling-usa/', '/interested-in-selling-eu-and-usa/', '/interested-in-selling-eu-qr-2/']) {
    const h = page(p);
    assert.ok(!/<form|action=|mailto:/i.test(h), p);
    assert.ok(hrefs(h).filter((x) => /^https?:/.test(x)).every((x) => x.startsWith('https://www.nitrocoffee.store') || x.startsWith('https://bonafidenitro.com')), `${p}: no invented external CTA`);
  }
  const us = page('/interested-in-selling-usa/');
  for (const s of ['SCHEDULE A DEMO', 'Craft Draft', 'tap and pour']) assert.ok(us.includes(s), s);
  for (const p of ['/interested-in-selling-eu-and-usa/', '/interested-in-selling-eu-qr-2/']) {
    const h = page(p);
    for (const s of ['180 days', '19L (5 gal)', 'recyclable', 'Why Us?', 'Private label', 'Czech']) assert.ok(h.includes(s), `${p} ${s}`);
  }
});

t('/blog/ now links the 2018 trends article; internal links all resolve', () => {
  const internal = hrefs(page('/blog/')).filter((x) => x.startsWith('/'));
  assert.ok(internal.includes('/coffee-trends-dominate-2018/'));
  for (const p of PATHS) for (const u of hrefs(page(p)).filter((x) => x.startsWith('/') && !x.startsWith('//'))) assert.ok(fs.existsSync(`dist${u}index.html`) || fs.existsSync(`dist${u}`), `${p} -> ${u}`);
});

t('preserved ranking query vocabulary (Codex review f638c67)', () => {
  const old = text(page('/nitro-cold-brew-old/')).toLowerCase();
  for (const s of ['is nitro coffee bad for you', 'is nitro cold brew bad for you', 'what is nitro cold brew']) assert.ok(old.includes(s), s);
  const easy = text(page('/nitro-cold-brew-coffee-made-easy-2/')).toLowerCase();
  for (const s of ['cold brew on draft', 'nitro draft coffee', 'coffee draft system']) assert.ok(easy.includes(s), s);
});

t('cancer article keeps organic-coffee/acrylamide vocabulary; trends page needs no outbound links (baseline links are incoming)', () => {
  const c = text(page('/coffee-doesnt-produce-cancer-says-leading-american-scientist/')).toLowerCase();
  for (const s of ['organic coffee for cancer', 'acrylamide']) assert.ok(c.includes(s), s);
  const art = page('/coffee-trends-dominate-2018/').match(/<article[\s\S]*?<\/article>/)[0];
  assert.ok(!hrefs(art).some((x) => /^https?:/.test(x)), 'no invented outbound links in article body');
});

t('trends article keeps millennials-coffee vocabulary, enforced by mustContainText (Codex review fb1f0e9)', () => {
  const tr = text(page('/coffee-trends-dominate-2018/')).toLowerCase();
  for (const s of ['coffee trends', 'millennials coffee']) assert.ok(tr.includes(s), s);
  const e = JSON.parse(fs.readFileSync('src/data/seo-baseline.json', 'utf8')).urls.find((x) => x.path === '/coffee-trends-dominate-2018/');
  assert.deepEqual(e.mustContainText, ['coffee trends', 'millennials coffee']);
});

t('titleUniquenessException is pair-scoped (Codex review fb1f0e9)', () => {
  const ex = JSON.parse(fs.readFileSync('src/data/seo-baseline.json', 'utf8')).preservationRules.titleUniquenessException;
  assert.deepEqual(ex, [['/products/', '/products-2/'], ['/nitro-cold-brew/', '/nitro-cold-brew-old/'], ['/blog/', '/blog/page/2/']]);
});
