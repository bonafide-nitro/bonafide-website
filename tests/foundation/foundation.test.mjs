import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSite, loadNavigation, loadProducts, loadRedirects, loadBaseline } from '../../src/lib/data.mjs';
import { productsForView } from '../../src/lib/products.mjs';
import { findForbidden } from '../../scripts/check-build-output.mjs';

const redirects = loadRedirects();
const baseline = loadBaseline();
const nav = loadNavigation();

test('site settings: apex HTTPS canonical host, trailing slash always, no deployment/analytics', () => {
  const s = loadSite();
  assert.equal(s.url, 'https://bonafidenitro.com');
  assert.equal(s.trailingSlash, 'always');
  assert.equal(s.deployment, null);
});

test('launch navigation is the 10 master-plan destinations and excludes /products-2/', () => {
  assert.deepEqual(nav.launch.map((i) => i.path), [
    '/', '/nitro-cold-brew/', '/howtobuy/', '/products/',
    '/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/', '/kegerators/', '/about/',
    '/contact-bona-fide-nitro-coffee-and-tea/', '/nitro-coffee-questions/', '/blog/',
  ]);
  assert.ok(!JSON.stringify(nav).includes('products-2'));
});

test('baseline: 17 tier-1 + 14 tier-2 protected URLs, all trailing-slash, 200, self-canonical', () => {
  assert.equal(baseline.urls.filter((u) => u.tier === 1).length, 17);
  assert.equal(baseline.urls.filter((u) => u.tier === 2).length, 14);
  for (const u of baseline.urls) assert.ok(u.path.endsWith('/'), u.path);
  assert.equal(new Set(baseline.urls.map((u) => u.path)).size, baseline.urls.length);
});

test('/products/ and /products-2/ are separate baseline entries with distinct contracts', () => {
  const p1 = baseline.urls.find((u) => u.path === '/products/');
  const p2 = baseline.urls.find((u) => u.path === '/products-2/');
  assert.ok(p1 && p2);
  assert.equal(p2.inSitemap, true);
  assert.equal(p2.maxInternalLinksIn, 0);
  assert.equal(p2.maxAmazonLinks, 0);
  assert.equal(p2.indexable, true);
  assert.equal(p2.canonical, 'self');
  assert.equal(p1.view, 'retail');
  assert.equal(p2.view, 'wholesale');
});

test('redirects: /products/ and /products-2/ are never redirect sources; /products-2/ never a destination', () => {
  for (const r of redirects) {
    assert.notEqual(r.from, '/products/');
    assert.notEqual(r.from, '/products-2/');
    assert.notEqual(r.to, '/products-2/');
  }
});

test('redirects: single hop — no destination is itself a redirect source; no self-loops', () => {
  const sources = new Set(redirects.map((r) => r.from));
  for (const r of redirects.filter((x) => x.to)) {
    assert.ok(!sources.has(r.to), `${r.from} -> ${r.to} chains`);
    assert.notEqual(r.from, r.to);
  }
});

test('redirects: unique ids and sources; pending-decision entries carry no invented destination', () => {
  assert.equal(new Set(redirects.map((r) => r.id)).size, redirects.length);
  assert.equal(new Set(redirects.map((r) => r.from)).size, redirects.length);
  assert.ok(redirects.some((r) => r.state === 'pending-decision'));
});

test('redirects: internal destinations are launch URLs or planned pages', () => {
  const known = new Set([...baseline.urls.map((u) => u.path), ...baseline.plannedPages.map((p) => p.path), '/sitemap.xml']);
  for (const r of redirects.filter((x) => x.to && x.to.startsWith('/') && !x.to.includes('*') && !x.to.includes('<'))) {
    assert.ok(known.has(r.to), `${r.from} -> ${r.to} is not a known launch URL`);
  }
});

test('all 11 legacy plugin redirects are represented', () => {
  assert.equal(redirects.filter((r) => r.type === 'external').length, 11);
});

test('products: retail and wholesale views differ; alliance SKU is wholesale-only', () => {
  const products = loadProducts();
  const retail = productsForView(products, 'retail').map((p) => p.id);
  const wholesale = productsForView(products, 'wholesale').map((p) => p.id);
  assert.notDeepEqual(retail, wholesale);
  assert.ok(!retail.includes('caveman-coffee-nitro'));
  assert.ok(wholesale.includes('caveman-coffee-nitro'));
  for (const p of products.filter((x) => x.line === 'alliance')) assert.deepEqual(p.views, ['wholesale']);
});

test('findForbidden detects the three suspicious strings and passes clean output', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
  fs.writeFileSync(path.join(dir, 'a.html'), '<p>ok</p>');
  const needles = baseline.preservationRules.forbiddenBuildStrings;
  assert.deepEqual(needles, ['quickdelivr', 'coredelivr', 'mpackage']);
  assert.equal(findForbidden(dir, needles).length, 0);
  fs.writeFileSync(path.join(dir, 'b.js'), 'x=QuickDelivr.com');
  assert.equal(findForbidden(dir, needles).length, 1);
  fs.rmSync(dir, { recursive: true });
});

test('built output (if present): products pages differ, wholesale has no link from nav, no forbidden strings', { skip: !fs.existsSync('dist/products/index.html') }, () => {
  const a = fs.readFileSync('dist/products/index.html', 'utf8');
  const b = fs.readFileSync('dist/products-2/index.html', 'utf8');
  assert.notEqual(a, b);
  for (const f of ['dist/index.html', 'dist/products/index.html', 'dist/products-2/index.html']) {
    assert.ok(!fs.readFileSync(f, 'utf8').includes('href="/products-2/"'), f);
  }
  assert.equal(findForbidden('dist', baseline.preservationRules.forbiddenBuildStrings).length, 0);
});
