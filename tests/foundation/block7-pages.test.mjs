// Block 7 (Issue #32): /blog/ + seven historical articles, checked against the built dist/ (run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = (p) => fs.readFileSync(`dist${p}index.html`, 'utf8');
const dec = (s) => s.replace(/&#38;|&amp;/g, '&').replace(/&#34;|&quot;/g, '"');
const title = (h) => dec(h.match(/<title>([^<]*)<\/title>/)[1]);
const h1s = (h) => [...h.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((m) => dec(m[1]));
const canonical = (h) => h.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const hrefs = (h) => [...h.matchAll(/href="([^"]+)"/g)].map((m) => dec(m[1]));
const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);

// [title, evidenced H1 or null when derived]
const CONTRACT = {
  '/blog/': ['Nitro Coffee & Nitro Tea News | Bona Fide Brewing Company | Blog', null],
  '/a-touch-of-vanilla-to-your-nitro-coffee/': ['A Touch of Vanilla to Your Nitro Coffee - Bona Fide Nitro Coffee', 'A Touch of Vanilla to Your Nitro Coffee'],
  '/how-ambient-stable-coffee-kegs-help-you-save-more-money/': ['How Ambient Stable Coffee Kegs Help You Save More Money', 'How Ambient Stable Coffee Kegs Help You Save More Money'],
  '/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/': ['Nitro Coffee in Time of COVID-19 Pandemic How Safe is it', 'Nitro Coffee in Time of COVID-19 Pandemic How Safe is it'],
  '/what-is-nitro-cold-brew-coffee/': ['What is Nitro cold brew coffee - Bona Fide Nitro Coffee', 'What is Nitro cold brew coffee'],
  '/nitro-coffee-health-benefits/': ['Nitro Coffee health benefits | Bona Fide Nitro Coffee Experts', 'NITRO COFFEE HEALTH BENEFITS'],
  '/is-coffee-healthy/': ['Is Coffee Healthy | Bona Fide Nitro Coffee | News & Blog', 'IS COFFEE HEALTHY'],
  '/nitro-coffee-future/': ['Nitro Coffee is the future | Bona Fide Nitro Brewing Company', 'NITRO COFFEE IS THE FUTURE'],
};
const ARTICLES = Object.keys(CONTRACT).filter((p) => p !== '/blog/');
// [original, updated] ISO dates evidenced in Issue #32
const DATES = {
  '/a-touch-of-vanilla-to-your-nitro-coffee/': ['2020-10-06', null],
  '/how-ambient-stable-coffee-kegs-help-you-save-more-money/': ['2020-08-22', '2020-08-24'],
  '/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/': ['2020-07-27', '2022-05-18'],
  '/what-is-nitro-cold-brew-coffee/': ['2020-07-21', '2020-08-03'],
  '/nitro-coffee-health-benefits/': ['2018-06-14', '2022-05-18'],
  '/is-coffee-healthy/': ['2018-05-08', '2020-02-05'],
  '/nitro-coffee-future/': ['2018-01-19', '2018-11-16'],
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
    assert.ok(!/<form\b|<iframe|<video|<img\b/i.test(h), 'no form/embed/img without evidence');
    assert.ok(!h.includes('noindex'));
    assert.ok(!hrefs(h).some((x) => x.includes('products-2')), 'no link to /products-2/');
  });
}

t('Organization + WebSite + WebPage + BreadcrumbList JSON-LD; no unevidenced Article schema', () => {
  for (const p of Object.keys(CONTRACT)) {
    const m = page(p).match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    const types = JSON.parse(m[1])['@graph'].map((n) => n['@type']);
    for (const ty of ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']) assert.ok(types.includes(ty), `${p} ${ty}`);
    assert.ok(!types.some((x) => /Article|VideoObject|FAQPage/.test(x)), `${p}: no unevidenced schema`);
  }
});

t('articles: author and evidenced dates retained', () => {
  for (const p of ARTICLES) {
    const h = page(p);
    assert.ok(h.includes('By John Goerke'), p);
    const [orig, upd] = DATES[p];
    assert.ok(h.includes(`datetime="${orig}"`), `${p} original`);
    if (upd) assert.ok(h.includes(`datetime="${upd}"`), `${p} updated`);
    assert.ok(hrefs(h).includes('/blog/'), `${p}: breadcrumb to /blog/`);
  }
});

t('/blog/: links only to built routes; no invented pagination/archives', () => {
  const h = page('/blog/');
  const internal = hrefs(h).filter((x) => x.startsWith('/') && !x.startsWith('//'));
  for (const u of internal) assert.ok(fs.existsSync(`dist${u}index.html`) || fs.existsSync(`dist${u}`), `broken/unbuilt link ${u}`);
  for (const p of ARTICLES) assert.ok(internal.includes(p), `${p} listed`);
  assert.ok(!internal.some((x) => /\/page\/|\/category\/|\/author\/|coffee-trends/.test(x)));
});

t('historical health/COVID framing kept; no new claim language', () => {
  for (const p of ['/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/', '/nitro-coffee-health-benefits/', '/is-coffee-healthy/']) {
    const h = page(p);
    assert.ok(h.includes('historical article'), p);
    assert.ok(h.includes('not medical advice'), p);
    assert.ok(!/\b(cures?|prevents?|treats?|proven|guarantee[sd]?)\b/i.test(h.replace(/<[^>]+>/g, ' ')), `${p}: no strengthened claim words`);
  }
});

t('vocabulary preserved', () => {
  const what = page('/what-is-nitro-cold-brew-coffee/').toLowerCase();
  for (const s of ['what is nitro coffee', 'cold brew', 'coffee on tap', 'founder']) assert.ok(what.includes(s), s);
  const amb = page('/how-ambient-stable-coffee-kegs-help-you-save-more-money/');
  for (const s of ['Ambient Stable Coffee Kegs', 'Lockdown: Cafes and Coffee Shop Owners Losing Money']) assert.ok(amb.includes(s), s);
  const hb = page('/nitro-coffee-health-benefits/');
  for (const s of ['Nitro Coffee Offers Better Nutritional Benefits Than Traditional Coffees', 'nitrogen', 'antioxidants', 'acidity']) assert.ok(hb.toLowerCase().includes(s.toLowerCase()), s);
  const ich = page('/is-coffee-healthy/');
  for (const s of ['Is Coffee Healthy?', 'What Coffee Does to Your Body', 'polyphenols', 'phytonutrients']) assert.ok(ich.includes(s), s);
  assert.ok(page('/a-touch-of-vanilla-to-your-nitro-coffee/').toLowerCase().includes('vanilla'));
});

t('scaffold marker kept on all eight; no unproven upload path', () => {
  for (const p of Object.keys(CONTRACT)) {
    const h = page(p);
    assert.ok(h.includes('scaffold-placeholder'), p);
    for (const u of hrefs(h)) if (u.startsWith('/wp-content/uploads/')) assert.ok(fs.existsSync(`public${u}`), u);
    assert.ok(!/youtube|\.pdf/i.test(h), `${p}: no invented video/PDF destination`);
  }
});
