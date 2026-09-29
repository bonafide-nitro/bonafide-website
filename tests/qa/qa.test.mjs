import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeFixture, page, jsonLd, run, codes, rm, cleanup } from './fixture.mjs';

// Runs `mutate` on a fresh healthy fixture, then asserts the given check:code is detected
// as blocking in strict mode. `invariant` additionally requires that foundation mode also fails.
const detects = (name, mutate, expected, { invariant = true, mode = 'strict' } = {}) =>
  test(`detects: ${name}`, () => {
    const fx = makeFixture();
    try {
      mutate(fx);
      const r = run(fx, mode);
      assert.ok(codes(r).includes(expected), `expected ${expected}, got ${codes(r).join(', ') || 'nothing'}`);
      assert.equal(r.passed, false, 'strict must fail');
      const f = run(fx, 'foundation');
      assert.equal(f.passed, !invariant, `foundation mode passed=${f.passed}, expected ${!invariant}`);
    } finally { cleanup(fx); }
  });

test('healthy fully-migrated fixture passes strict mode with zero findings', () => {
  const fx = makeFixture();
  try {
    const r = run(fx, 'strict');
    assert.deepEqual(r.findings, []);
    assert.ok(r.passed && r.strictWouldPass);
  } finally { cleanup(fx); }
});

// --- T1 / migration-remaining semantics ---
detects('missing protected URL (migration-remaining: blocks strict, reported in foundation)', (fx) => rm(fx, 'about'), 'T1:protected-url-missing', { invariant: false });
detects('unexpected built page not in manifest', (fx) => fx.put('surprise/index.html', page({ p: '/surprise/', title: 'S' })), 'T1:unmanifested-page');
detects('missing 404 page', (fx) => rm(fx, '404.html'), 'T1:no-404-page');
detects('do-not-generate path built (wp-login.php)', (fx) => fx.put('wp-login.php', 'x'), 'T1:do-not-generate-present');
detects('stray non-directory .html file', (fx) => fx.put('foo.html', '<html></html>'), 'T13:stray-html-file');

// --- T3 canonical / indexability ---
detects('cross-canonical', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: 'https://bonafidenitro.com/products/' })), 'T3:cross-canonical');
detects('wrong canonical (www / http)', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: 'http://www.bonafidenitro.com/about/' })), 'T3:canonical-wrong');
detects('missing canonical', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: null })), 'T3:canonical-missing');
detects('canonical without trailing slash', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: 'https://bonafidenitro.com/about' })), 'T13:canonical-no-trailing-slash');
detects('canonical pointing at a redirecting URL', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: 'https://bonafidenitro.com/contact/' })), 'T3:canonical-to-redirect');
detects('noindex on an indexable protected page', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', robots: 'noindex' })), 'T3:noindex-on-indexable');
detects('declared-noindex page that is indexable', (fx) => fx.put('privacy-policies/index.html', page({ p: '/privacy-policies/', title: 'Privacy' })), 'T3:missing-noindex');

// --- T4 on-page ---
detects('missing H1', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', h1: null })), 'T4:h1-missing');
detects('multiple H1', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<h1>Second</h1>' })), 'T4:h1-multiple');
detects('missing title', (fx) => fx.put('about/index.html', '<html><head><link rel="canonical" href="https://bonafidenitro.com/about/"></head><body><h1>x</h1></body></html>'), 'T4:title-missing');
detects('duplicate title with no exception', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'Home Nitro' })), 'T4:duplicate-title');
detects('title contract violated (titleMustContain)', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Shop', h1: 'Nitro Kegs', body: '<p>Nitro Style</p><a href="https://amazon.com/x">a</a>' })), 'T4:title-contract');
detects('H1 contract violated (h1MustContain)', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Kegs', h1: 'Shop', body: '<p>Nitro Style</p><a href="https://amazon.com/x">a</a>' })), 'T4:h1-contract');

// --- T5 content + /products/ vs /products-2/ separation ---
detects('mustContainText missing', (fx) => fx.put('products-2/index.html', page({ p: '/products-2/', title: 'Kegs 2', body: '$1 $2' })), 'T5:content-missing');
detects('/products-2/ carries Amazon links (maxAmazonLinks)', (fx) => fx.put('products-2/index.html', page({ p: '/products-2/', title: 'K2', body: `<p>Jittery John's $1 $2</p><a href="https://amazon.com/x">a</a>` })), 'T5:amazon-links-max');
detects('lookalike Amazon link (domain only in a query string) is not counted', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://example.com/?next=amazon.com">a</a>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:amazon-links-min');
detects('lookalike Amazon host (amazon.attacker.com) is not counted', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://amazon.attacker.com/fake">a</a>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:amazon-links-min');
detects('lookalike Amazon host (notamazon.com) is not counted', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://notamazon.com/dp/1">a</a>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:amazon-links-min');
detects('lookalike store link (domain only in a query string) is not counted', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://www.amazon.com/dp/1">a</a><a href="https://example.com/?next=nitrocoffee.store">s</a>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:store-links-min');
detects('/products/ and /products-2/ rendered identically', (fx) => {
  const html = page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://amazon.com/x">a</a>`, canonical: 'https://bonafidenitro.com/products/' });
  fx.put('products/index.html', html);
  fx.put('products-2/index.html', html.replace(/\/products\//g, '/products-2/'));
}, 'T5:products-identical');
detects('/products-2/ canonical collapsed onto /products/', (fx) => fx.put('products-2/index.html', page({ p: '/products-2/', title: 'K2', body: `<p>Jittery John's $1 $2</p>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:products-collapse');
detects('redirect from /products-2/ to /products/', (fx) => fx.redirects.push({ id: 'p2', type: 'exact', from: '/products-2/', to: '/products/', status: 301, state: 'defined' }), 'T5:products-redirect-source');
detects('redirect from /products/', (fx) => fx.redirects.push({ id: 'p1', type: 'exact', from: '/products/', to: '/about/', status: 301, state: 'defined' }), 'T5:products-redirect-source');
detects('wildcard redirect that would swallow /products-2/', (fx) => fx.redirects.push({ id: 'w', type: 'pattern', from: '/products-*', to: '/products/', status: 301, state: 'defined' }), 'T5:products-redirect-source');
detects('redirect targeting /products-2/', (fx) => fx.redirects.push({ id: 'to2', type: 'exact', from: '/old/', to: '/products-2/', status: 301, state: 'defined' }), 'T5:products2-redirect-destination');
detects('internal link to /products-2/', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/products-2/">w</a>' })), 'T8:products2-linked');
detects('internal link to /products-2 (slash-less / absolute)', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="https://bonafidenitro.com/products-2">w</a>' })), 'T8:products2-linked');
detects('manifest weakened: /products-2/ dropped from sitemap contract', (fx) => { fx.baseline.urls.find((u) => u.path === '/products-2/').inSitemap = false; }, 'T5:manifest-products2-contract');

// --- T2 redirect register ---
detects('redirect loop', (fx) => fx.redirects.push({ id: 'la', type: 'exact', from: '/a/', to: '/b/', status: 301, state: 'defined' }, { id: 'lb', type: 'exact', from: '/b/', to: '/a/', status: 301, state: 'defined' }), 'T2:loop');
detects('redirect self-loop', (fx) => fx.redirects.push({ id: 'self', type: 'exact', from: '/s/', to: '/s/', status: 301, state: 'defined' }), 'T2:loop');
detects('redirect chain (two hops)', (fx) => fx.redirects.push({ id: 'ch', type: 'exact', from: '/old/', to: '/contact/', status: 301, state: 'defined' }), 'T2:chain');
detects('non-301 redirect', (fx) => { fx.redirects[0].status = 302; }, 'T2:non-301');
detects('defined redirect without destination', (fx) => { fx.redirects[0].to = null; }, 'T2:defined-without-destination');
detects('pending-decision redirect that carries a destination', (fx) => { fx.redirects[2].to = 'https://example.com/'; }, 'T2:pending-with-destination');
detects('pending-decision redirect emitted into .htaccess', (fx) => fx.put('.htaccess', 'Redirect 301 /services/x/ https://example.com/'), 'T2:pending-emitted');
detects('redirect to a URL that is not protected/planned', (fx) => { fx.redirects[0].to = '/nowhere/'; }, 'T2:unknown-destination');
detects('protected 200 URL used as a redirect source', (fx) => fx.redirects.push({ id: 'pp', type: 'exact', from: '/about/', to: '/', status: 301, state: 'defined' }), 'T2:protected-url-redirected');
detects('duplicate redirect source', (fx) => fx.redirects.push({ ...fx.redirects[0], id: 'dup' }), 'T2:duplicate-source');
detects('redirect emitted as HTML meta refresh', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', head: '<meta http-equiv="refresh" content="0; url=/">' })), 'T2:meta-refresh-redirect');
test('detects: redirect register failing schema validation', () => {
  const fx = makeFixture();
  try {
    const r = run(fx, 'foundation', { redirectSchemaError: 'defined redirects need a destination' });
    assert.ok(codes(r).includes('T2:register-schema-invalid') && !r.passed);
  } finally { cleanup(fx); }
});

// --- T7 images ---
detects('referenced /wp-content/uploads/ asset missing', (fx) => rm(fx, 'wp-content'), 'T7:missing-upload');
detects('absolute-URL upload reference missing', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<img srcset="https://bonafidenitro.com/wp-content/uploads/2020/02/x.png 1x, /wp-content/uploads/2020/01/hero.jpg 2x">' })), 'T7:missing-upload');

// --- T8 / T13 links ---
detects('internal link to a redirecting URL', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/contact/">c</a>' })), 'T8:link-to-redirect');
detects('absolute http:// apex link hits the protocol canonicalisation redirect', (fx) => { fx.redirects.push(...canon()); fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="http://bonafidenitro.com/pricing/">c</a>' })); }, 'T8:link-to-redirect');
detects('absolute https://www link hits the host canonicalisation redirect', (fx) => { fx.redirects.push(...canon()); fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="https://www.bonafidenitro.com/pricing/">c</a>' })); }, 'T8:link-to-redirect');
detects('internal link without trailing slash', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/pricing">c</a>' })), 'T13:link-missing-trailing-slash');
detects('broken internal link', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/nope/">c</a>' })), 'T8:broken-internal-link');
detects('internal ?p=<post-id> link is do-not-generate (master plan §7.6)', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/?p=9999">c</a>' })), 'T8:link-to-do-not-generate');
detects('internal link to do-not-generate search URL', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/?s=abc">c</a>' })), 'T8:link-to-do-not-generate');
detects('link to protected page that is not built (migration-remaining)', (fx) => { fx.baseline.urls.push({ path: '/later/', tier: 1, expect: '200', canonical: 'self', indexable: true, inSitemap: false }); fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/later/">c</a>' })); }, 'T8:link-to-unbuilt-page', { invariant: false });
detects('minInternalLinksIn not met', (fx) => { fx.baseline.urls.find((u) => u.path === '/products/').minInternalLinksIn = 5; }, 'T8:inbound-links-min');

// --- T9 sitemap ---
detects('sitemap missing /products-2/', (fx) => fx.put('sitemap.xml', `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://bonafidenitro.com/</loc></url><url><loc>https://bonafidenitro.com/products/</loc></url><url><loc>https://bonafidenitro.com/about/</loc></url></urlset>`), 'T9:sitemap-missing-products-2');
detects('sitemap absent (migration-remaining)', (fx) => rm(fx, 'sitemap.xml'), 'T9:sitemap-absent', { invariant: false });
detects('sitemap not valid XML urlset', (fx) => fx.put('sitemap.xml', '<html>nope</html>'), 'T9:sitemap-invalid');
detects('sitemap lists a noindex URL', (fx) => fx.put('sitemap.xml', `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/products/', '/products-2/', '/about/', '/privacy-policies/'].map((u) => `<url><loc>https://bonafidenitro.com${u}</loc></url>`).join('')}</urlset>`), 'T9:sitemap-disallowed-url');
detects('sitemap lists a foreign host', (fx) => fx.put('sitemap.xml', `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>`), 'T9:sitemap-foreign-url');

// --- T10 robots ---
detects('robots.txt absent (migration-remaining)', (fx) => rm(fx, 'robots.txt'), 'T10:robots-absent', { invariant: false });
detects('robots.txt disallows a protected URL', (fx) => fx.put('robots.txt', 'User-agent: *\nDisallow: /products-2/\nSitemap: https://bonafidenitro.com/sitemap.xml\n'), 'T10:robots-blocks-protected');
detects('robots.txt without sitemap', (fx) => fx.put('robots.txt', 'User-agent: *\nAllow: /\n'), 'T10:robots-no-sitemap');

// --- T11 security ---
for (const s of ['quickdelivr', 'coredelivr', 'mpackage']) {
  detects(`forbidden injected-script string "${s}" in HTML`, (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: `<script src="https://cdn.${s}.com/x.js"></script>` })), 'T11:forbidden-string');
}
detects('forbidden string in a bundled JS asset (case-insensitive)', (fx) => fx.put('_astro/app.js', 'var u="//QuickDelivr.net"'), 'T11:forbidden-string');
detects('forbidden string in a file name', (fx) => fx.put('assets/mpackage.txt', 'x'), 'T11:forbidden-string-in-path');
detects('third-party script host outside the allowlist', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<script src="https://evil.example/x.js"></script>' })), 'T11:unexpected-script-host');
test('allowlisted third-party script host is accepted', () => {
  const fx = makeFixture();
  try {
    fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<script src="https://www.googletagmanager.com/gtm.js"></script>' }));
    fx.config.allowedScriptHosts = ['www.googletagmanager.com'];
    assert.deepEqual(codes(run(fx)), []);
  } finally { cleanup(fx); }
});

detects('script URL assigned in inline JS to a non-allowlisted host', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: `<script>var s=document.createElement('script');s.src = 'https://evil.example/payload.js';document.head.appendChild(s)</script>` })), 'T11:unexpected-script-host');
detects('script URL assigned in bundled JS to a non-allowlisted host', (fx) => fx.put('_astro/app.js', `var s=document.createElement("script");s.setAttribute("src","//evil.example/p.js")`), 'T11:unexpected-script-host');

// --- T6 schema ---
detects('invalid JSON-LD', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<script type="application/ld+json">{oops</script>' })), 'T6:jsonld-invalid');
detects('manifest-required JSON-LD type missing', (fx) => { fx.baseline.urls.find((u) => u.path === '/about/').schema = ['Article']; }, 'T6:schema-missing');

const withTypes = (types) => page({ p: '/about/', title: 'About us', body: '', head: jsonLd(types) });
detects('site-wide Organization missing on a page (not declared in manifest)', (fx) => fx.put('about/index.html', withTypes(['WebSite', 'BreadcrumbList'])), 'T6:schema-sitewide-missing');
detects('site-wide WebSite missing on a page (not declared in manifest)', (fx) => fx.put('about/index.html', withTypes(['Organization', 'BreadcrumbList'])), 'T6:schema-sitewide-missing');
detects('BreadcrumbList missing on a page (not declared in manifest)', (fx) => fx.put('about/index.html', withTypes(['Organization', 'WebSite'])), 'T6:schema-page-missing');
detects('no JSON-LD at all on a page', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', head: '' })), 'T6:schema-page-missing');
test('scaffold page without schema is migration-remaining, not an invariant', () => {
  const fx = makeFixture();
  try {
    fx.put('about/index.html', page({ p: '/about/', title: 'About us', head: '', scaffold: true }));
    const r = run(fx, 'foundation');
    assert.ok(codes(r).includes('T6:schema-page-missing'));
    assert.equal(r.findings.filter((f) => f.check === 'T6' && f.kind === 'invariant').length, 0);
    assert.equal(run(fx, 'strict').passed, false);
  } finally { cleanup(fx); }
});

// --- T9 well-formedness (parser, not regexp) ---
const urls4 = ['/', '/products/', '/products-2/', '/about/'];
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
detects('sitemap omitting every </url> close tag', (fx) => fx.put('sitemap.xml', `<?xml version="1.0"?><urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc>`).join('')}</urlset>`), 'T9:sitemap-invalid');
detects('sitemap with an unescaped ampersand', (fx) => fx.put('sitemap.xml', `<urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc></url>`).join('')}<url><loc>https://bonafidenitro.com/a?b=1&c=2</loc></url></urlset>`), 'T9:sitemap-invalid');
detects('sitemap with mismatched tags', (fx) => fx.put('sitemap.xml', `<urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</url></loc>`).join('')}</urlset>`), 'T9:sitemap-invalid');
detects('sitemap <url> without <loc>', (fx) => fx.put('sitemap.xml', `<urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc></url>`).join('')}<url></url></urlset>`), 'T9:sitemap-invalid');
detects('sitemap with trailing junk after root', (fx) => fx.put('sitemap.xml', `<urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc></url>`).join('')}</urlset><x/>`), 'T9:sitemap-invalid');
test('well-formed sitemap with lastmod, comment and escaped ampersand passes', () => {
  const fx = makeFixture();
  try {
    fx.put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<!-- generated --><urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc><lastmod>2026-01-01</lastmod></url>`).join('')}</urlset>\n`);
    assert.deepEqual(codes(run(fx)), []);
  } finally { cleanup(fx); }
});

// --- T2 protocol/host canonicalisation chains ---
const canon = () => [
  { id: 'http-apex', type: 'canonicalisation', from: 'http://bonafidenitro.com/*', to: 'https://bonafidenitro.com/*', status: 301, state: 'defined' },
  { id: 'http-www', type: 'canonicalisation', from: 'http://www.bonafidenitro.com/*', to: 'https://bonafidenitro.com/*', status: 301, state: 'defined' },
  { id: 'https-www', type: 'canonicalisation', from: 'https://www.bonafidenitro.com/*', to: 'https://bonafidenitro.com/*', status: 301, state: 'defined' },
];
test('canonicalisation rules as declared are one hop (no chain)', () => {
  const fx = makeFixture();
  try { fx.redirects.push(...canon()); assert.deepEqual(codes(run(fx)), []); } finally { cleanup(fx); }
});
detects('http apex redirected to www, then www to apex (two hops)', (fx) => {
  const c = canon(); c[0].to = 'https://www.bonafidenitro.com/*'; fx.redirects.push(...c);
}, 'T2:chain');
detects('canonicalisation loop between http and https rules', (fx) => {
  fx.redirects.push({ id: 'a', type: 'canonicalisation', from: 'https://www.bonafidenitro.com/*', to: 'http://www.bonafidenitro.com/*', status: 301, state: 'defined' }, { id: 'b', type: 'canonicalisation', from: 'http://www.bonafidenitro.com/*', to: 'https://www.bonafidenitro.com/*', status: 301, state: 'defined' });
}, 'T2:loop');

// --- T13 config ---
test('detects: astro config drift (trailingSlash / format / output)', () => {
  const fx = makeFixture();
  try {
    const ok = run(fx, 'strict', { astroConfig: "output: 'static', trailingSlash: 'always', build: { format: 'directory' }" });
    assert.deepEqual(ok.findings, []);
    const bad = run(fx, 'foundation', { astroConfig: "output: 'server', trailingSlash: 'never', build: { format: 'file' }" });
    assert.deepEqual(codes(bad).sort(), ['T13:astro-build-format', 'T13:astro-output', 'T13:astro-trailing-slash']);
    assert.equal(bad.passed, false);
  } finally { cleanup(fx); }
});
test('detects: site.yaml trailing-slash drift', () => {
  const fx = makeFixture();
  try {
    fx.site.trailingSlash = 'never';
    assert.ok(codes(run(fx, 'foundation')).includes('T13:site-trailing-slash'));
  } finally { cleanup(fx); }
});

// --- explicit modes ---
test('foundation mode: scaffold placeholders are reported as migration-remaining, never silently OK; strict blocks them', () => {
  const fx = makeFixture();
  try {
    fx.put('about/index.html', page({ p: '/about/', title: 'Scaffold', scaffold: true, robots: 'noindex' }));
    fx.put('404.html', page({ p: '/404.html', title: 'nf', canonical: null, scaffold: true }));
    const f = run(fx, 'foundation');
    assert.equal(f.passed, true);
    assert.equal(f.strictWouldPass, false);
    assert.ok(codes(f).includes('T5:placeholder-page') && codes(f).includes('T3:noindex-on-indexable') && codes(f).includes('T1:placeholder-404'));
    assert.ok(f.migrationRemaining.length >= 3);
    const s = run(fx, 'strict');
    assert.equal(s.passed, false);
    assert.equal(s.blocking.length, s.findings.length);
  } finally { cleanup(fx); }
});
test('scaffold marker does not excuse invariants (cross-canonical / multiple H1 on a scaffold page still fail foundation)', () => {
  const fx = makeFixture();
  try {
    fx.put('about/index.html', page({ p: '/about/', title: 'S', scaffold: true, canonical: 'https://bonafidenitro.com/', body: '<h1>2</h1>' }));
    const f = run(fx, 'foundation');
    assert.equal(f.passed, false);
    assert.ok(codes(f).includes('T3:cross-canonical') && codes(f).includes('T4:h1-multiple'));
  } finally { cleanup(fx); }
});
test('unknown mode is rejected (no hidden skip mode)', () => {
  const fx = makeFixture();
  try { assert.throws(() => run(fx, 'lenient'), /unknown QA mode/); } finally { cleanup(fx); }
});

// --- end-to-end: the real CLI process, exit codes, and the real built dist/ ---
const cli = (args) => spawnSync(process.execPath, ['qa/cli.mjs', ...args], { encoding: 'utf8' });
const haveDist = fs.existsSync('dist/products/index.html');

test('CLI: rejects unknown mode with exit 2', () => {
  assert.equal(cli(['--mode', 'lenient']).status, 2);
});
test('CLI: strict mode fails on a fixture missing protected URLs; foundation mode reports them without blocking', () => {
  const fx = makeFixture();
  try {
    // healthy for a *different* manifest, so the real manifest's protected URLs are missing
    const strict = cli(['--mode', 'strict', '--dist', fx.dir]);
    assert.equal(strict.status, 1);
    assert.match(strict.stdout, /STRICT MIGRATION QA: FAIL/);
    assert.match(strict.stdout, /protected-url-missing/);
  } finally { cleanup(fx); }
});
test('CLI (real dist/): foundation passes and states migration is incomplete; strict fails', { skip: !haveDist }, () => {
  const f = cli(['--mode', 'foundation']);
  assert.equal(f.status, 0, f.stdout + f.stderr);
  assert.match(f.stdout, /FOUNDATION QA: PASS/);
  assert.match(f.stdout, /MIGRATION IS NOT COMPLETE/);
  assert.match(f.stdout, /MIGRATION WORK REMAINING/);
  const s = cli(['--mode', 'strict']);
  assert.equal(s.status, 1);
  assert.match(s.stdout, /protected-url-missing/);
  assert.match(s.stdout, /sitemap-absent/);
});
test('CLI (real dist/ copy): injected script string fails foundation mode with exit 1', { skip: !haveDist }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-dist-'));
  try {
    fs.cpSync('dist', tmp, { recursive: true });
    fs.appendFileSync(path.join(tmp, 'index.html'), '<script src="https://quickdelivr.example/a.js"></script>');
    const r = cli(['--mode', 'foundation', '--dist', tmp]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /T11 forbidden-string/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('CLI (real dist/ copy): a link to /products-2/ fails foundation mode', { skip: !haveDist }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-dist-'));
  try {
    fs.cpSync('dist', tmp, { recursive: true });
    fs.appendFileSync(path.join(tmp, 'index.html'), '<a href="/products-2/">x</a>');
    const r = cli(['--mode', 'foundation', '--dist', tmp]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /T8 products2-linked/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('real manifests: redirect register passes the QA register checks (pending-decision never executable)', async () => {
  const { loadInputs } = await import('../../qa/cli.mjs');
  const inputs = loadInputs();
  assert.equal(inputs.redirectSchemaError, undefined);
  const fx = makeFixture();
  try {
    const r = run(fx, 'foundation', { baseline: inputs.baseline, redirects: inputs.redirects });
    assert.deepEqual(r.findings.filter((f) => f.check === 'T2'), []);
  } finally { cleanup(fx); }
});

// --- T2 templated AMP chains (ZANETA_DECISION on PR #24) ---
const ampGeneric = { id: 'amp-pattern', type: 'pattern', from: '/<slug>/amp/', to: '/<slug>/', status: 301, state: 'defined' };
const ampBooking = { id: 'thank-you', type: 'exact', from: '/thank-you/', to: '/about/', status: 301, state: 'defined' };
const ampOverride = { id: 'amp-thank-you', type: 'exact', from: '/thank-you/amp/', to: '/about/', status: 301, state: 'defined' };
detects('templated AMP destination that lands on another redirect source', (fx) => { fx.redirects.push(ampGeneric, ampBooking); fx.config.templateSlugs = ['thank-you']; }, 'T2:chain');
test('exact AMP override takes precedence over the generic pattern (no chain), in either register order', () => {
  for (const order of [[ampOverride, ampGeneric, ampBooking], [ampGeneric, ampBooking, ampOverride]]) {
    const fx = makeFixture();
    try { fx.redirects.push(...order); fx.config.templateSlugs = ['thank-you']; assert.deepEqual(codes(run(fx)), []); } finally { cleanup(fx); }
  }
});
test('real register: the three booking AMP URLs are exact one-hop 301s to /book-appointment/ with no chain', async () => {
  const { loadInputs } = await import('../../qa/cli.mjs');
  const { redirects, config } = loadInputs();
  assert.deepEqual([...config.templateSlugs].sort(), ['appointment-cancellation-confirmation', 'kegerators', 'my-bookings', 'thank-you']);
  for (const from of ['/thank-you/amp/', '/my-bookings/amp/', '/appointment-cancellation-confirmation/amp/']) {
    const rule = redirects.find((r) => r.from === from);
    assert.ok(rule, from);
    assert.deepEqual([rule.to, rule.status, rule.state], ['/book-appointment/', 301, 'defined']);
  }
  const fx = makeFixture();
  try {
    const r = run(fx, 'foundation', { baseline: loadInputs().baseline, redirects, config });
    assert.deepEqual(r.findings.filter((f) => f.code === 'chain'), []);
    // without the exact overrides the generic rule would chain through the booking redirects
    const stripped = redirects.filter((x) => !x.id.startsWith('amp-booking-'));
    const r2 = run(fx, 'foundation', { baseline: loadInputs().baseline, redirects: stripped, config });
    assert.equal(r2.findings.filter((f) => f.code === 'chain').length, 3); // kegerators has no redirect source, so is not a chain
  } finally { cleanup(fx); }
});
