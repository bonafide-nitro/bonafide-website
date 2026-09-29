// Migration QA checks (master plan §13.2 T1–T11, T13) over a built static dist/ plus the
// source-of-truth manifests. Two finding kinds:
//   invariant           — a real regression; blocks in every mode.
//   migration-remaining — expected incompleteness (page/artifact not built yet, or a
//                         page still marked as a scaffold placeholder); reported in
//                         foundation mode, blocking in strict mode.
// There is no other way for a finding to be non-blocking: strict mode blocks everything.
import fs from 'node:fs';
import path from 'node:path';
import { scanDist } from './lib/scan.mjs';
import { jsonLdTypes } from './lib/html.mjs';
import { patternToRegExp, hasPlaceholder } from './lib/patterns.mjs';
import { parseXml } from './lib/xml.mjs';

export const INV = 'invariant';
export const REM = 'migration-remaining';

const ORIGIN = 'https://bonafidenitro.com';
const HOSTS = new Set(['bonafidenitro.com', 'www.bonafidenitro.com']);
const hasExt = (p) => /\.[a-z0-9]+$/i.test(p);
const isP1 = (p) => p === '/products/';
const isP2 = (p) => p === '/products-2/';
// Master plan §13.2 T6 contract (deployment blocker); the config may add to it, never remove from it.
const SITE_WIDE_SCHEMA = ['Organization', 'WebSite'];
const PER_PAGE_SCHEMA = ['BreadcrumbList'];

class Findings {
  constructor() { this.map = new Map(); }
  add(check, code, kind, urlPath, message, from) {
    const key = `${check}|${code}|${kind}|${urlPath ?? ''}|${message}`;
    let f = this.map.get(key);
    if (!f) this.map.set(key, (f = { check, code, kind, path: urlPath ?? null, message, from: [] }));
    if (from && !f.from.includes(from)) f.from.push(from);
  }
  list() { return [...this.map.values()]; }
}

const normalizeHref = (href, fromPath) => {
  const h = href.trim();
  if (!h || h.startsWith('#') || /^(mailto:|tel:|javascript:|data:|sms:)/i.test(h)) return null;
  let u;
  try { u = new URL(h, ORIGIN + fromPath); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (!HOSTS.has(u.hostname)) return { external: true, url: u };
  return { external: false, path: decodeURI(u.pathname), search: u.search, url: u };
};

// T5 commerce links are counted by parsed hostname, never by substring (a query string or path may mention a domain).
const isAmazonHost = (h) => /(^|\.)amazon\.[a-z.]+$/.test(h) || /(^|\.)amzn\.(to|com|eu|asia)$/.test(h);
const isStoreHost = (h) => h === 'nitrocoffee.store' || h.endsWith('.nitrocoffee.store');
const hostOf = (href, fromPath, test) => {
  let u; try { u = new URL(href.trim(), ORIGIN + fromPath); } catch { return false; }
  return /^https?:$/.test(u.protocol) && test(u.hostname.toLowerCase());
};

export const runQa = ({ distDir, baseline, redirects, redirectSchemaError, site, astroConfig, config = {}, mode = 'foundation' }) => {
  if (!['foundation', 'strict'].includes(mode)) throw new Error(`unknown QA mode: ${mode}`);
  const { files, pages, strayHtml, notFound, textFiles } = scanDist(distDir);
  const F = new Findings();
  const entries = baseline.urls;
  const entryByPath = new Map(entries.map((e) => [e.path, e]));
  const planned = (baseline.plannedPages ?? []).map((p) => p.path);
  const known = new Set([...entryByPath.keys(), ...planned]);
  const rules = redirects;
  const rules_ = baseline.preservationRules ?? {};
  const contractKind = (page) => (page?.scaffold ? REM : INV);
  const pathRules = rules.filter((r) => typeof r.from === 'string' && r.from.startsWith('/'));
  const ruleMatchers = pathRules.map((r) => ({ r, re: patternToRegExp(r.from) }));
  // Exact (placeholder-free) sources take precedence over pattern sources, whatever their register order.
  const matchRule = (p) => (ruleMatchers.find(({ r, re }) => !hasPlaceholder(r.from) && re.test(p)) ?? ruleMatchers.find(({ re }) => re.test(p)))?.r;
  const urlRules = rules.filter((r) => typeof r.from === 'string' && /^https?:\/\//.test(r.from)).map((r) => ({ r, re: patternToRegExp(r.from) }));
  // The rule a redirect destination would hit next (path, protocol/host canonicalisation or full-URL rule).
  // A `*` in a full-URL destination passes the request path through, so it is probed with a sample path.
  const nextHop = (to) => {
    if (typeof to !== 'string' || !to) return null;
    if (to.startsWith('/')) return hasPlaceholder(to) ? null : (matchRule(to) ?? urlRules.find(({ re }) => re.test(ORIGIN + to))?.r ?? null);
    if (!/^https?:\/\//.test(to)) return null;
    const wildcard = to.includes('*');
    if (/[<{]/.test(to)) return null;
    const probe = to.replace(/\*/g, 'qa-probe/');
    const hit = urlRules.find(({ re }) => re.test(probe))?.r;
    if (hit || wildcard) return hit ?? null;
    let u; try { u = new URL(to); } catch { return null; }
    return HOSTS.has(u.hostname) ? (matchRule(u.pathname + u.search) ?? null) : null;
  };
  const uniq = (a) => [...new Set(a)];
  // A templated path redirect (`/<slug>/amp/` -> `/<slug>/`) is expanded for each slug the evidence names as a real
  // generated URL (config.templateSlugs; never invented) and the expanded destination is followed. The slug counts only
  // if this rule wins precedence for the expanded request (an exact one-hop override removes the chain).
  const slugChains = (r) => {
    if (typeof r.to !== 'string' || !r.to.includes('<slug>') || !r.from.startsWith('/') || !r.from.includes('<slug>')) return [];
    const out = [];
    for (const slug of config.templateSlugs ?? []) {
      const request = r.from.replace(/<slug>/g, slug);
      const dest = r.to.replace(/<slug>/g, slug);
      const via = matchRule(request) === r ? nextHop(dest) : null;
      if (via) out.push({ request, dest, via });
    }
    return out;
  };

  // ---------- manifest sanity (guards the product-separation contract itself) ----------
  {
    const p1 = entryByPath.get('/products/');
    const p2 = entryByPath.get('/products-2/');
    if (!p1 || !p2) F.add('T5', 'manifest-products-missing', INV, null, 'baseline must list both /products/ and /products-2/ as separate entries');
    if (p2 && !(p2.inSitemap === true && p2.maxInternalLinksIn === 0 && p2.indexable === true && p2.canonical === 'self'))
      F.add('T5', 'manifest-products2-contract', INV, '/products-2/', 'baseline /products-2/ must stay inSitemap:true, indexable:true, canonical:self, maxInternalLinksIn:0');
    if (rules_.productsAndProducts2Separate !== true) F.add('T5', 'manifest-products-separation', INV, null, 'preservationRules.productsAndProducts2Separate must be true');
    for (const e of entries) if (!e.path.endsWith('/')) F.add('T13', 'manifest-no-trailing-slash', INV, e.path, 'protected path lacks trailing slash');
    if (new Set(entries.map((e) => e.path)).size !== entries.length) F.add('T1', 'manifest-duplicate-path', INV, null, 'duplicate path in baseline');
  }

  // ---------- T1: URL matrix as representable in a static build ----------
  for (const e of entries) if (!pages.has(e.path)) F.add('T1', 'protected-url-missing', REM, e.path, `protected URL (tier ${e.tier}, expect ${e.expect}) is not built: dist/${e.path.slice(1)}index.html missing`);
  for (const p of pages.keys()) if (!known.has(p)) F.add('T1', 'unmanifested-page', INV, p, 'built page is not in the protected manifest or planned pages (unexpected URL)');
  if (!notFound) F.add('T1', 'no-404-page', INV, null, 'dist/404.html missing: unknown URLs must resolve to a real 404');
  else if (notFound.scaffold) F.add('T1', 'placeholder-404', REM, '/404.html', '404 page is still a scaffold placeholder');
  for (const g of baseline.doNotGenerate ?? []) {
    const re = patternToRegExp(g);
    if (g.startsWith('/') && !g.includes('?')) {
      for (const rel of files.keys()) {
        const asPath = '/' + rel;
        if (re.test(asPath) || re.test(asPath.replace(/index\.html$/, ''))) F.add('T1', 'do-not-generate-present', INV, asPath, `built file matches do-not-generate path ${g}`);
      }
    }
  }
  for (const rel of strayHtml) F.add('T13', 'stray-html-file', INV, '/' + rel, 'non-directory .html file in dist (build.format must be "directory": /<path>/index.html)');

  // ---------- T2: redirect register ----------
  if (redirectSchemaError) F.add('T2', 'register-schema-invalid', INV, null, `redirect register failed schema validation: ${redirectSchemaError}`);
  const seenId = new Set(); const seenFrom = new Set();
  for (const r of rules) {
    if (seenId.has(r.id)) F.add('T2', 'duplicate-id', INV, r.from, `duplicate redirect id ${r.id}`); seenId.add(r.id);
    if (seenFrom.has(r.from)) F.add('T2', 'duplicate-source', INV, r.from, 'duplicate redirect source'); seenFrom.add(r.from);
    if (r.status !== 301) F.add('T2', 'non-301', INV, r.from, `redirect status must be 301, got ${r.status}`);
    if (r.state === 'defined' && (r.to == null || r.to === '')) F.add('T2', 'defined-without-destination', INV, r.from, `defined redirect ${r.id} has no destination`);
    if (r.state === 'pending-decision' && r.to != null) F.add('T2', 'pending-with-destination', INV, r.from, `pending-decision redirect ${r.id} must not carry a destination`);
    if (!['defined', 'pending-decision'].includes(r.state)) F.add('T2', 'unknown-state', INV, r.from, `redirect ${r.id} has unknown state ${r.state}`);
    if (r.to && r.to === r.from) F.add('T2', 'loop', INV, r.from, `redirect ${r.id} points to itself`);
    if (r.to && /^https?:/.test(r.to) && !r.to.startsWith('https://')) F.add('T2', 'insecure-destination', INV, r.from, `redirect ${r.id} destination is not https`);
    if (r.to && r.to.startsWith('/') && !hasPlaceholder(r.to) && !r.to.endsWith('/') && !hasExt(r.to)) F.add('T13', 'redirect-destination-no-slash', INV, r.from, `redirect ${r.id} destination ${r.to} lacks trailing slash`);
    if (r.to && r.to.startsWith('/') && !hasPlaceholder(r.to) && !known.has(r.to) && r.to !== '/sitemap.xml') F.add('T2', 'unknown-destination', INV, r.from, `redirect ${r.id} destination ${r.to} is not a protected/planned URL`);
    // one hop / chain / loop, following through any register rule matching the destination
    if (r.state === 'defined' && r.to) {
      const visited = new Set([r.id]); let cur = r; let hops = 0; let loop = false;
      for (;;) {
        const next = cur.state === 'defined' ? nextHop(cur.to) : null;
        if (!next) break;
        hops++;
        if (visited.has(next.id)) { loop = true; break; }
        visited.add(next.id); cur = next;
      }
      if (loop) F.add('T2', 'loop', INV, r.from, `redirect ${r.id} is part of a redirect loop`);
      else if (hops > 0) F.add('T2', 'chain', INV, r.from, `redirect ${r.id} -> ${r.to} chains through ${hops} more redirect(s); must be one hop`);
    }
    if (r.state === 'defined') for (const { request, dest, via } of slugChains(r)) F.add('T2', 'chain', INV, request, `redirect ${r.id}: ${request} -> ${dest} chains through ${via.id}; must be one hop (add an exact one-hop override)`);
    // product separation
    for (const { r: rr, re } of ruleMatchers.filter((m) => m.r === r)) {
      if (re.test('/products/') || re.test('/products-2/')) F.add('T5', 'products-redirect-source', INV, r.from, `redirect ${r.id} would redirect /products/ or /products-2/ (they must stay separate 200 pages)`);
    }
    if (r.to === '/products-2/' && r.from !== '/products-2') F.add('T5', 'products2-redirect-destination', INV, r.from, `redirect ${r.id} targets /products-2/ (forbidden: it is not a redirect destination)`);
    if (isP2(r.from) || (isP2(r.to ?? '') && r.from === '/products/') ) F.add('T5', 'products-collapse', INV, r.from, `redirect ${r.id} collapses /products/ and /products-2/`);
    // a protected 200 URL must never be a redirect source
    if (entryByPath.has(r.from) && entryByPath.get(r.from).expect === '200') F.add('T2', 'protected-url-redirected', INV, r.from, `redirect ${r.id} redirects protected 200 URL ${r.from}`);
  }
  // pending-decision entries must never be emitted as executable redirects
  const pendings = rules.filter((r) => r.state === 'pending-decision');
  for (const [rel, text] of textFiles) {
    const isRedirectArtifact = rel === '.htaccess' || rel === '_redirects' || /(^|\/)redirects?\.(json|txt|conf)$/.test(rel);
    if (!isRedirectArtifact) continue;
    for (const r of pendings) if (text.includes(r.from)) F.add('T2', 'pending-emitted', INV, r.from, `pending-decision redirect ${r.id} appears in built redirect artifact dist/${rel}`);
  }
  for (const p of pages.values()) if (p.metaRefresh) F.add('T2', 'meta-refresh-redirect', INV, p.path, 'page uses <meta http-equiv="refresh">; redirects must be server-side 301s, never emitted as HTML');

  // ---------- T3 / T4 / T5 / T6: per built page ----------
  const titleGroups = new Map();
  for (const page of pages.values()) {
    const e = entryByPath.get(page.path);
    const ck = contractKind(page);
    if (page.scaffold) F.add('T5', 'placeholder-page', REM, page.path, 'page is still a scaffold placeholder (Stage 6 content not migrated)');

    // T3 canonical
    if (page.canonicals.length === 0) F.add('T3', 'canonical-missing', INV, page.path, 'no <link rel="canonical">');
    else if (page.canonicals.length > 1) F.add('T3', 'canonical-multiple', INV, page.path, 'multiple canonical links');
    for (const c of page.canonicals.slice(0, 1)) {
      if (c !== ORIGIN + page.path) {
        const asUrl = (() => { try { return new URL(c, ORIGIN + page.path); } catch { return null; } })();
        const targetPath = asUrl && HOSTS.has(asUrl.hostname) ? asUrl.pathname : null;
        if (targetPath && targetPath !== page.path && known.has(targetPath)) F.add('T3', 'cross-canonical', INV, page.path, `canonical points at another protected URL: ${c}`);
        else F.add('T3', 'canonical-wrong', INV, page.path, `canonical must be ${ORIGIN}${page.path}, got ${c}`);
        if ((isP1(page.path) && targetPath === '/products-2/') || (isP2(page.path) && targetPath === '/products/')) F.add('T5', 'products-collapse', INV, page.path, `canonical collapses /products/ and /products-2/: ${c}`);
      }
      const cp = (() => { try { return new URL(c, ORIGIN).pathname; } catch { return ''; } })();
      if (cp && !cp.endsWith('/') && !hasExt(cp)) F.add('T13', 'canonical-no-trailing-slash', INV, page.path, `canonical lacks trailing slash: ${c}`);
      if (cp && matchRule(cp)) F.add('T3', 'canonical-to-redirect', INV, page.path, `canonical target ${cp} is a redirect source`);
    }
    const noindex = page.robots.some((r) => r.includes('noindex'));
    if (e?.indexable === true && noindex) F.add('T3', 'noindex-on-indexable', ck, page.path, 'protected indexable page carries noindex');
    if (e && e.indexable === false && !noindex) F.add('T3', 'missing-noindex', INV, page.path, 'declared noindex page is indexable');

    // T4 on-page
    if (!page.title) F.add('T4', 'title-missing', INV, page.path, 'missing or empty <title>');
    else titleGroups.set(page.title, [...(titleGroups.get(page.title) ?? []), page.path]);
    if (page.h1Count === 0) F.add('T4', 'h1-missing', INV, page.path, 'no <h1>');
    if (page.h1Count > 1) F.add('T4', 'h1-multiple', INV, page.path, `${page.h1Count} <h1> elements; exactly one required`);
    for (const s of e?.titleMustContain ?? []) if (!(page.title ?? '').toLowerCase().includes(s.toLowerCase())) F.add('T4', 'title-contract', ck, page.path, `title must contain "${s}"`);
    for (const s of e?.h1MustContain ?? []) if (!(page.h1s[0] ?? '').toLowerCase().includes(s.toLowerCase())) F.add('T4', 'h1-contract', ck, page.path, `H1 must contain "${s}"`);

    // T5 content preservation
    const lc = (s) => s.replace(/\s+/g, ' ');
    const missing = (e?.mustContainText ?? []).filter((s) => !page.text.includes(lc(s.replace(/[\u2018\u2019]/g, "'"))));
    if (missing.length) F.add('T5', 'content-missing', ck, page.path, `mustContainText missing: ${missing.join(' | ')}`);
    const amazon = page.hrefs.filter((h) => hostOf(h, page.path, isAmazonHost)).length;
    const store = page.hrefs.filter((h) => hostOf(h, page.path, isStoreHost)).length;
    const prices = (page.text.match(/\$\s?\d[\d,]*(?:\.\d+)?/g) ?? []).length;
    if (e?.minAmazonLinks != null && amazon < e.minAmazonLinks) F.add('T5', 'amazon-links-min', ck, page.path, `expected >= ${e.minAmazonLinks} Amazon links, found ${amazon}`);
    if (e?.maxAmazonLinks != null && amazon > e.maxAmazonLinks) F.add('T5', 'amazon-links-max', INV, page.path, `expected <= ${e.maxAmazonLinks} Amazon links, found ${amazon}`);
    if (e?.minStoreLinks != null && store < e.minStoreLinks) F.add('T5', 'store-links-min', ck, page.path, `expected >= ${e.minStoreLinks} store links, found ${store}`);
    if (e?.minPriceStrings != null && prices < e.minPriceStrings) F.add('T5', 'price-strings-min', ck, page.path, `expected >= ${e.minPriceStrings} price strings, found ${prices}`);

    // T6 schema
    const types = [];
    for (const block of page.jsonLd) {
      try { types.push(...jsonLdTypes(JSON.parse(block))); } catch { F.add('T6', 'jsonld-invalid', INV, page.path, 'JSON-LD block does not parse'); }
    }
    for (const t of e?.schema ?? []) if (!types.includes(t)) F.add('T6', 'schema-missing', ck, page.path, `JSON-LD @type ${t} required by manifest`);
    // §13.2 T6: site-wide and per-page schema are required on every built page whether or not the manifest declares them.
    for (const t of [...SITE_WIDE_SCHEMA, ...(config.requiredSiteWideSchema ?? [])]) if (!types.includes(t)) F.add('T6', 'schema-sitewide-missing', ck, page.path, `JSON-LD @type ${t} is required site-wide (master plan §13.2 T6)`);
    for (const t of [...PER_PAGE_SCHEMA, ...(config.requiredPageSchema ?? [])]) if (!types.includes(t)) F.add('T6', 'schema-page-missing', ck, page.path, `JSON-LD @type ${t} is required on every page (master plan §13.2 T6)`);
  }
  for (const [title, group] of titleGroups) {
    if (group.length > 1 && !group.every((p) => (rules_.titleUniquenessException ?? []).includes(p)))
      F.add('T4', 'duplicate-title', INV, group.join(' , '), `pages share title "${title}" and no declared exception applies`);
  }
  const b1 = pages.get('/products/'); const b2 = pages.get('/products-2/');
  if (b1 && b2 && (b1.raw === b2.raw || b1.text === b2.text)) F.add('T5', 'products-identical', INV, '/products-2/', '/products/ and /products-2/ rendered output is identical');

  // ---------- T8 internal links (and T13 slash rule for links) ----------
  const inbound = new Map();
  const dngQuery = (baseline.doNotGenerate ?? []).filter((g) => g.includes('?')).map((g) => ({ g, re: patternToRegExp(g) }));
  for (const page of pages.values()) {
    for (const href of page.hrefs) {
      const n = normalizeHref(href, page.path);
      if (!n || n.external) continue;
      const target = n.path === '/products-2' ? '/products-2/' : n.path;
      if (isP2(target) && page.path !== '/products-2/') F.add('T8', 'products2-linked', INV, '/products-2/', 'internal link to /products-2/ (it must have zero inbound internal links)', page.path);
      if (!hasExt(n.path)) { const s = inbound.get(target) ?? new Set(); s.add(page.path); inbound.set(target, s); }
      const hit = dngQuery.find(({ re }) => re.test(n.path + n.search));
      if (hit) { F.add('T8', 'link-to-do-not-generate', INV, n.path + n.search, `internal link matches do-not-generate ${hit.g}`, page.path); continue; }
      if (isP2(target)) continue;
      if (matchRule(n.path) || matchRule(n.path + n.search) || urlRules.some(({ re }) => re.test(n.url.href))) { F.add('T8', 'link-to-redirect', INV, n.path, 'internal link points at a redirecting URL', page.path); continue; }
      if (!hasExt(n.path) && !n.path.endsWith('/')) { F.add('T13', 'link-missing-trailing-slash', INV, n.path, 'internal link lacks trailing slash', page.path); continue; }
      if (n.path.startsWith('/wp-content/uploads/')) continue; // T7
      const exists = hasExt(n.path) ? files.has(n.path.slice(1)) : pages.has(n.path);
      if (!exists) {
        if (known.has(n.path)) F.add('T8', 'link-to-unbuilt-page', REM, n.path, 'internal link to a protected/planned URL that is not built yet', page.path);
        else F.add('T8', 'broken-internal-link', INV, n.path, 'internal link target does not exist in the build and is not a protected/planned URL', page.path);
      }
    }
  }
  for (const e of entries) {
    const from = [...(inbound.get(e.path) ?? [])].filter((p) => p !== e.path);
    const target = pages.get(e.path);
    if (e.maxInternalLinksIn != null && from.length > e.maxInternalLinksIn) F.add('T8', 'inbound-links-max', INV, e.path, `expected <= ${e.maxInternalLinksIn} inbound internal links, found ${from.length}`);
    if (e.minInternalLinksIn != null && target && from.length < e.minInternalLinksIn) F.add('T8', 'inbound-links-min', contractKind(target), e.path, `expected >= ${e.minInternalLinksIn} pages linking here, found ${from.length}`);
  }

  // ---------- T7 image path preservation ----------
  const uploadRe = /(?:https?:\/\/(?:www\.)?bonafidenitro\.com)?(\/wp-content\/uploads\/[^\s"'<>()\\,]+)/gi;
  for (const [rel, text] of textFiles) {
    for (const m of text.replace(/&amp;/g, '&').matchAll(uploadRe)) {
      const ref = m[1].replace(/[?#].*$/, '');
      let decoded = ref; try { decoded = decodeURI(ref); } catch { /* keep raw */ }
      if (!files.has(decoded.slice(1))) F.add('T7', 'missing-upload', INV, decoded, 'referenced /wp-content/uploads/ asset is missing from the build (original path must be preserved)', '/' + rel);
    }
  }

  // ---------- T9 sitemap ----------
  const sm = textFiles.get('sitemap.xml');
  if (sm == null) F.add('T9', 'sitemap-absent', REM, '/sitemap.xml', 'dist/sitemap.xml not generated yet');
  else {
    let locs = []; let invalid = null;
    try {
      const root = parseXml(sm);
      if (root.name !== 'urlset' || root.attrs.xmlns !== 'http://www.sitemaps.org/schemas/sitemap/0.9') throw new Error('root must be <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      for (const u of root.children) {
        if (u.name !== 'url') throw new Error(`unexpected <${u.name}> inside <urlset>`);
        const l = u.children.filter((c) => c.name === 'loc');
        if (l.length !== 1 || !l[0].text.trim()) throw new Error('every <url> needs exactly one non-empty <loc>');
        const bad = u.children.find((c) => !['loc', 'lastmod', 'changefreq', 'priority'].includes(c.name) && !c.name.includes(':'));
        if (bad) throw new Error(`unexpected <${bad.name}> inside <url>`);
        locs.push(l[0].text.trim());
      }
    } catch (err) { invalid = err.message; locs = []; }
    if (invalid) F.add('T9', 'sitemap-invalid', INV, '/sitemap.xml', `sitemap.xml is not a well-formed sitemaps.org <urlset> document: ${invalid}`);
    const listed = new Set();
    for (const loc of locs) {
      if (!loc.startsWith(ORIGIN + '/')) { F.add('T9', 'sitemap-foreign-url', INV, loc, 'sitemap URL is not on https://bonafidenitro.com'); continue; }
      const p = loc.slice(ORIGIN.length);
      if (listed.has(p)) F.add('T9', 'sitemap-duplicate', INV, p, 'URL listed twice');
      listed.add(p);
      const e = entryByPath.get(p);
      if (!e || e.inSitemap !== true) { F.add('T9', 'sitemap-disallowed-url', INV, p, 'sitemap lists a URL that is noindex, utility, technical or not in the manifest'); continue; }
      const page = pages.get(p);
      if (!page) F.add('T9', 'sitemap-url-unbuilt', REM, p, 'sitemap lists a URL that does not return 200 in the build');
      else if (page.canonicals[0] !== ORIGIN + p) F.add('T9', 'sitemap-url-not-self-canonical', INV, p, 'sitemap URL is not self-canonical');
    }
    for (const e of entries.filter((x) => x.inSitemap === true && !listed.has(x.path))) {
      if (isP2(e.path)) F.add('T9', 'sitemap-missing-products-2', INV, e.path, '/products-2/ must be in sitemap.xml (sole discovery path, orphan by design)');
      else F.add('T9', 'sitemap-missing-url', pages.has(e.path) ? INV : REM, e.path, 'manifest inSitemap URL missing from sitemap.xml');
    }
  }

  // ---------- T10 robots.txt ----------
  const robots = textFiles.get('robots.txt');
  if (robots == null) F.add('T10', 'robots-absent', REM, '/robots.txt', 'dist/robots.txt not generated yet');
  else {
    if (!new RegExp(`^\\s*sitemap:\\s*${ORIGIN.replace(/\./g, '\\.')}/sitemap\\.xml\\s*$`, 'im').test(robots)) F.add('T10', 'robots-no-sitemap', INV, '/robots.txt', 'robots.txt must declare Sitemap: https://bonafidenitro.com/sitemap.xml');
    for (const line of robots.split(/\r?\n/)) {
      const m = line.match(/^\s*disallow:\s*(\S+)/i);
      if (!m) continue;
      const re = new RegExp('^' + m[1].split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*').replace(/\\\$$/, '$'));
      for (const e of entries) if (re.test(e.path)) F.add('T10', 'robots-blocks-protected', INV, e.path, `robots.txt "${line.trim()}" disallows a protected URL`);
    }
  }

  // ---------- T11 security ----------
  const needles = rules_.forbiddenBuildStrings ?? [];
  if (!needles.length) F.add('T11', 'no-forbidden-list', INV, null, 'manifest has no forbiddenBuildStrings');
  for (const [rel, abs] of files) {
    const hay = fs.readFileSync(abs).toString('latin1').toLowerCase();
    for (const n of needles) {
      if (hay.includes(n.toLowerCase())) F.add('T11', 'forbidden-string', INV, '/' + rel, `forbidden string "${n}" found in build output`);
      if (rel.toLowerCase().includes(n.toLowerCase())) F.add('T11', 'forbidden-string-in-path', INV, '/' + rel, `forbidden string "${n}" in file name`);
    }
  }
  const allowed = new Set((config.allowedScriptHosts ?? []).map((h) => h.toLowerCase()));
  for (const page of [...pages.values(), ...(notFound ? [{ ...notFound, path: '/404.html' }] : [])]) {
    for (const src of page.scriptSrcs) {
      let u; try { u = new URL(src, ORIGIN + page.path); } catch { F.add('T11', 'unparseable-script-src', INV, page.path, `script src ${src}`); continue; }
      if (!HOSTS.has(u.hostname) && !allowed.has(u.hostname.toLowerCase())) F.add('T11', 'unexpected-script-host', INV, page.path, `third-party script host ${u.hostname} is not in the allowlist`);
    }
  }

  // ---------- T13 config-level trailing-slash rules ----------
  if (site) {
    if (site.trailingSlash !== 'always') F.add('T13', 'site-trailing-slash', INV, null, 'site.yaml trailingSlash must be "always"');
    if (site.buildFormat !== 'directory') F.add('T13', 'site-build-format', INV, null, 'site.yaml buildFormat must be "directory"');
  }
  if (astroConfig != null) {
    if (!/trailingSlash:\s*['"]always['"]/.test(astroConfig)) F.add('T13', 'astro-trailing-slash', INV, null, "astro.config.mjs must set trailingSlash: 'always'");
    if (!/format:\s*['"]directory['"]/.test(astroConfig)) F.add('T13', 'astro-build-format', INV, null, "astro.config.mjs must set build.format: 'directory'");
    if (!/output:\s*['"]static['"]/.test(astroConfig)) F.add('T13', 'astro-output', INV, null, "astro.config.mjs must set output: 'static'");
  }

  const findings = F.list();
  const blocking = findings.filter((f) => mode === 'strict' || f.kind === INV);
  const migrationRemaining = findings.filter((f) => f.kind === REM);
  return {
    mode, findings, blocking, migrationRemaining,
    passed: blocking.length === 0,
    strictWouldPass: findings.length === 0,
    stats: { pagesBuilt: pages.size, protectedUrls: entries.length, protectedBuilt: entries.filter((e) => pages.has(e.path)).length },
  };
};

export const CHECK_MAP = {
  T1: 'URL matrix', T2: 'Redirects', T3: 'Canonical & indexability', T4: 'On-page elements', T5: 'Content preservation & product separation',
  T6: 'Schema (JSON-LD)', T7: 'Images', T8: 'Internal links', T9: 'Sitemap', T10: 'robots.txt', T11: 'Security', T13: 'Trailing slash',
};
