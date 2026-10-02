// Block 10 (Issue #38): Tier-3 legal routes, checked against the built dist/ (run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const ROUTES = ['/privacy-policies/', '/terms-of-service/'];

for (const p of ROUTES) {
  t(`${p}: static 200, self-canonical, noindex, one H1, scaffold-marked, no scripts`, () => {
    const h = fs.readFileSync(`dist${p}index.html`, 'utf8');
    assert.equal(h.match(/<link rel="canonical" href="([^"]+)"/)?.[1], `https://bonafidenitro.com${p}`);
    assert.ok(/<meta name="robots" content="noindex"/.test(h));
    assert.equal([...h.matchAll(/<h1[ >]/g)].length, 1);
    assert.ok(h.includes('scaffold-placeholder'), 'legal copy is not preserved, so the scaffold marker must stay');
    assert.ok(/Migration placeholder/.test(h));
    assert.ok(!/http-equiv="refresh"/i.test(h));
    assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(h), 'only JSON-LD script allowed');
    assert.ok(!/quickdelivr|coredelivr|mpackage|thrive|sydney/i.test(h));
    const types = JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'].map((n) => n['@type']);
    for (const ty of ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']) assert.ok(types.includes(ty), ty);
  });

  t(`${p}: no invented legal language`, () => {
    const body = fs.readFileSync(`dist${p}index.html`, 'utf8').match(/<main[^>]*>([\s\S]*)<\/main>/)[1];
    assert.ok(!/governing law|jurisdiction|we collect|personal (data|information)|cookies|liabilit|indemnif|arbitrat|©|copyright|last updated|effective (date|as of)|@/i.test(body));
  });
}

t('legal routes are excluded from the sitemap and the baseline contract is unchanged', () => {
  const base = JSON.parse(fs.readFileSync('src/data/seo-baseline.json', 'utf8'));
  const all = Object.values(base).filter(Array.isArray).flat();
  for (const p of ROUTES) {
    const e = all.find((x) => x.path === p);
    assert.deepEqual([e.tier, e.expect, e.canonical, e.indexable, e.inSitemap], [3, '200', 'self', false, false]);
  }
  for (const f of fs.readdirSync('dist').filter((n) => /^sitemap.*\.xml$/.test(n))) {
    const x = fs.readFileSync(`dist/${f}`, 'utf8');
    for (const p of ROUTES) assert.ok(!x.includes(p), `${f} lists ${p}`);
  }
});
