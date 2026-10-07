// Builds tiny synthetic dist/ trees + manifests for the QA negative tests.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runQa, REQUIRED_REDIRECTS } from '../../qa/checks.mjs';

const ORIGIN = 'https://bonafidenitro.com';

export const jsonLd = (types = ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']) =>
  `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': types.map((t) => ({ '@type': t })) })}</script>`;

export const page = ({ p, title, h1 = `Heading ${p}`, body = '', head = jsonLd(), canonical = ORIGIN + p, robots, scaffold = false }) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>` +
  (robots ? `<meta name="robots" content="${robots}">` : '') +
  (scaffold ? '<meta name="bonafide-qa" content="scaffold-placeholder">' : '') +
  (canonical ? `<link rel="canonical" href="${canonical}">` : '') +
  `${head}</head><body>${h1 === null ? '' : `<h1>${h1}</h1>`}${body}</body></html>`;

const entry = (p, extra = {}) => ({ path: p, tier: 1, expect: '200', canonical: 'self', indexable: true, inSitemap: true, ...extra });

export const baselineFixture = () => ({
  urls: [
    entry('/'),
    entry('/products/', { titleMustContain: ['Kegs'], h1MustContain: ['Nitro Kegs'], mustContainText: ['Nitro Style'], minAmazonLinks: 1, minStoreLinks: 1, view: 'retail' }),
    entry('/products-2/', { mustContainText: ["Jittery John's"], minPriceStrings: 2, maxAmazonLinks: 0, maxInternalLinksIn: 0, mustNotRedirectTo: '/products/', view: 'wholesale' }),
    entry('/about/'),
    entry('/privacy-policies/', { tier: 3, indexable: false, robots: 'noindex', inSitemap: false }),
  ],
  plannedPages: [{ path: '/book-appointment/', expect: '200' }],
  doNotGenerate: ['/wp-admin/*', '/wp-login.php*', '/wp-json/*', '/xmlrpc.php', '/?s={search_term_string}', '/comments/feed/', '/?bpa_page=bookingpress_download&*'],
  preservationRules: {
    productsAndProducts2Separate: true,
    titleUniquenessException: [['/products/', '/products-2/'], ['/about/', '/privacy-policies/']],
    forbiddenBuildStrings: ['quickdelivr', 'coredelivr', 'mpackage'],
  },
});

// Healthy register: three base rules plus the full required T2 inventory (one rule per required source).
export const redirectsFixture = () => {
  const base = [
    { id: 'contact', type: 'exact', from: '/contact/', to: '/about/', status: 301, state: 'defined' },
    { id: 'slashless-about', type: 'exact', from: '/about', to: '/about/', status: 301, state: 'defined' },
    { id: 'pending', type: 'external', from: '/services/x/', to: null, status: 301, state: 'pending-decision' },
  ];
  const inventory = REQUIRED_REDIRECTS.map((q, i) => ({ id: `req-${i}`, type: 'exact', from: q.from, to: q.to, status: 301, state: 'defined' }));
  return [...base, ...inventory];
};
export const storeLinks = (n) => Array.from({ length: n }, (_, i) => `<a href="https://www.nitrocoffee.store/products/p${i}">s${i}</a>`).join('');

const nav = '<a href="/">Home</a><a href="/products/">Products</a><a href="/about/">About</a>';

// A complete, healthy, fully "migrated" mini-site: strict mode must pass on it.
export const makeFixture = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-fx-'));
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
  put('index.html', page({ p: '/', title: 'Home Nitro', body: `${nav}<img src="/wp-content/uploads/2020/01/hero.jpg">` }));
  put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `${nav}<p>Nitro Style</p><a href="https://www.amazon.com/dp/1">buy</a><a href="https://www.nitrocoffee.store/products/x">shop</a>` }));
  put('products-2/index.html', page({ p: '/products-2/', title: 'Cold Brew Kegs', h1: 'Wholesale', body: `<p>Jittery John's $10 $12</p>${storeLinks(22)}` }));
  put('about/index.html', page({ p: '/about/', title: 'About us', body: nav }));
  put('privacy-policies/index.html', page({ p: '/privacy-policies/', title: 'Privacy', robots: 'noindex' }));
  put('404.html', page({ p: '/404.html', title: 'Not found', canonical: null }));
  put('wp-content/uploads/2020/01/hero.jpg', 'jpg');
  put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/products/', '/products-2/', '/about/'].map((u) => `<url><loc>${ORIGIN}${u}</loc></url>`).join('')}</urlset>`);
  put('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  return { dir, put, baseline: baselineFixture(), redirects: redirectsFixture(), site: { trailingSlash: 'always', buildFormat: 'directory' }, config: { allowedScriptHosts: [], articleRoutes: ['/fixture-post/'], commerceInventory: { pages: { '/products/': { amazon: ['https://www.amazon.com/dp/1'], store: ['https://www.nitrocoffee.store/products/x'] }, '/products-2/': { store: Array.from({ length: 22 }, (_, i) => `https://www.nitrocoffee.store/products/p${i}`) } } } } };
};

export const run = (fx, mode = 'strict', extra = {}) => runQa({ distDir: fx.dir, baseline: fx.baseline, redirects: fx.redirects, site: fx.site, config: fx.config, mode, ...extra });
export const codes = (r) => r.findings.map((f) => `${f.check}:${f.code}`);
export const rm = (fx, rel) => fs.rmSync(path.join(fx.dir, rel), { recursive: true, force: true });
export const cleanup = (fx) => fs.rmSync(fx.dir, { recursive: true, force: true });
