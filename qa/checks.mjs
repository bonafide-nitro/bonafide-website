// Migration QA checks (master plan §13.2 T1–T11, T13) over a built static dist/ plus the
// source-of-truth manifests. Two finding kinds:
//   invariant           — a real regression; blocks in every mode.
//   migration-remaining — expected incompleteness (page/artifact not built yet, or a
//                         page still marked as a scaffold placeholder); reported in
//                         foundation mode, blocking in strict mode.
// There is no other way for a finding to be non-blocking: strict mode blocks everything.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { scanDist } from './lib/scan.mjs';
import { jsonLdTypes } from './lib/html.mjs';
import { patternToRegExp, hasPlaceholder } from './lib/patterns.mjs';
import { parseXml } from './lib/xml.mjs';

// Structural image validation (T7): a signature alone accepts truncated or garbage-suffixed files.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(b) { let c = 0xffffffff; for (const x of b) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
// The IDAT stream must inflate cleanly, and for non-interlaced images to exactly the scanline size the IHDR implies (Adam7 pass by pass for interlaced images).
function pngPixelsDecode(hdr, data) {
  let raw;
  try { raw = zlib.inflateSync(data); } catch { return false; }
  const [w, h, depth, color, , , interlace] = [hdr.readUInt32BE(0), hdr.readUInt32BE(4), hdr[8], hdr[9], hdr[10], hdr[11], hdr[12]];
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  if (!channels || interlace > 1) return false;
  if (hdr[10] !== 0 || hdr[11] !== 0) return false; // only compression method 0 and filter method 0 exist
  if (!{ 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] }[color].includes(depth)) return false;
  if (interlace === 1) { // Adam7: seven passes, each non-empty pass is `rows` scanlines of a filter byte + packed pixels
    let off = 0;
    for (const [x0, y0, dx, dy] of [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]]) {
      const pw = Math.ceil((w - x0) / dx); const ph = Math.ceil((h - y0) / dy);
      if (pw > 0 && ph > 0 && !filtersValid(raw, off, ph, 1 + Math.ceil((pw * channels * depth) / 8))) return false;
      if (pw > 0 && ph > 0) off += ph * (1 + Math.ceil((pw * channels * depth) / 8));
    }
    return raw.length === off;
  }
  const stride = 1 + Math.ceil((w * channels * depth) / 8);
  return raw.length === h * stride && filtersValid(raw, 0, h, stride);
}
// Every scanline starts with a filter-type byte; PNG defines only types 0-4.
function filtersValid(raw, start, rows, stride) {
  for (let r = 0; r < rows; r++) { const o = start + r * stride; if (o >= raw.length || raw[o] > 4) return false; }
  return true;
}
function validPng(b) {
  if (b.length < 45 || !b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return false;
  let off = 8; let first = true; let hdr = null; let plte = false; const idat = [];
  while (off + 12 <= b.length) {
    const len = b.readUInt32BE(off); const type = b.toString('latin1', off + 4, off + 8);
    const end = off + 12 + len;
    if (end > b.length) return false;
    if (b.readUInt32BE(end - 4) !== crc32(b.subarray(off + 4, end - 4))) return false;
    if (first) { if (type !== 'IHDR' || len !== 13 || b.readUInt32BE(off + 8) === 0 || b.readUInt32BE(off + 12) === 0) return false; hdr = b.subarray(off + 8, off + 21); first = false; }
    else if (type === 'IHDR') return false;
    if (!(b[off + 4] & 0x20) && !['IHDR', 'PLTE', 'IDAT', 'IEND'].includes(type)) return false; // an unrecognised critical chunk makes the file undecodable
    if (type === 'PLTE') { // palette: once, before the first IDAT, whole RGB triples, at most 2^depth (and 256) entries
      if (plte || idat.length > 0 || len === 0 || len % 3 !== 0 || len / 3 > Math.min(256, 2 ** hdr[8]) || hdr[9] === 0 || hdr[9] === 4) return false;
      plte = true;
    }
    if (type === 'IDAT') idat.push(b.subarray(off + 8, end - 4));
    if (type === 'IEND') return len === 0 && idat.length > 0 && end === b.length && (hdr[9] !== 3 || plte) && pngPixelsDecode(hdr, Buffer.concat(idat));
    off = end;
  }
  return false;
}
const RANKING_EVIDENCED_TOTAL = 21; // 10 exact paths + 11 further URLs summarised in docs/migration/02-seo-raw-data-appendix.md; not read from the manifest so `complete: true` alone cannot waive the gap
const ALLIANCE_REQUIRED = 6; // fixed by the master plan; deliberately not read from the manifest so it cannot be weakened in step with the list
// A DQT segment holds one or more tables: Pq/Tq byte (Pq 0|1, Tq 0-3) then 64 entries of (Pq+1) bytes.
function dqtValid(seg) {
  let o = 0;
  while (o < seg.length) {
    if ((seg[o] >> 4) > 1 || (seg[o] & 0x0f) > 3) return false;
    o += 1 + 64 * ((seg[o] >> 4) + 1);
  }
  return seg.length > 0 && o === seg.length;
}
// A DHT segment holds one or more tables: class/id byte, 16 code-length counts, then exactly sum(counts) symbols.
function dhtValid(seg) {
  let o = 0;
  while (o < seg.length) {
    if (o + 17 > seg.length || (seg[o] >> 4) > 1 || (seg[o] & 0x0f) > 3) return false;
    let n = 0; for (let i = 1; i <= 16; i++) n += seg[o + i];
    if (n === 0 || n > 256 || o + 17 + n > seg.length) return false;
    let free = 1; // remaining code space; each length doubles it, codes consume it, and the all-ones code stays reserved
    for (let i = 1; i <= 16; i++) { free = free * 2 - seg[o + i]; if (free < 0) return false; }
    if (free < 1) return false;
    o += 17 + n;
  }
  return seg.length > 0;
}
function validJpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8 || b[b.length - 2] !== 0xff || b[b.length - 1] !== 0xd9) return false;
  let off = 2; let sof = false; let scans = 0; let dqt = false; let dht = false; let huffman = true;
  while (off + 2 <= b.length) {
    if (b[off] !== 0xff) return false;
    const m = b[off + 1];
    if (m === 0xff) { off++; continue; }
    if (m === 0xd9) return scans > 0 && off + 2 === b.length; // EOI must close the file after at least one scan
    if (off + 4 > b.length) return false;
    const len = b.readUInt16BE(off + 2);
    if (len < 2 || off + 2 + len > b.length) return false;
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { if (len < 8 || b.readUInt16BE(off + 5) === 0 || b.readUInt16BE(off + 7) === 0) return false; sof = true; huffman = m < 0xc9; }
    if (m === 0xdb) { if (!dqtValid(b.subarray(off + 4, off + 2 + len))) return false; dqt = true; }
    if (m === 0xc4) { if (!dhtValid(b.subarray(off + 4, off + 2 + len))) return false; dht = true; }
    off += 2 + len;
    if (m === 0xda) { // entropy-coded data follows the scan header, up to the next real marker (stuffed 0xFF00 and RSTn are data)
      if (!sof || !dqt || (huffman && !dht)) return false; // a scan cannot decode without its quantisation (and Huffman) tables
      const start = off;
      while (off + 1 < b.length && !(b[off] === 0xff && b[off + 1] !== 0x00 && !(b[off + 1] >= 0xd0 && b[off + 1] <= 0xd7) && b[off + 1] !== 0xff)) off++;
      if (off === start) return false;
      scans++;
    }
  }
  return false;
}

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
// Master plan §13.2 T2 inventory (deployment blocker): protocol/host canonicalisation, AMP, the 11 legacy plugin rules and
// slash normalisation. A rule is matched by its source, so a deleted rule cannot pass by leaving the survivors valid.
// `defined` rules must also have a decided destination. Config/manifest may add to this list, never remove from it.
const HOST_DEST = 'https://bonafidenitro.com/*';
export const REQUIRED_REDIRECTS = [
  ...['http://bonafidenitro.com/*', 'http://www.bonafidenitro.com/*', 'https://www.bonafidenitro.com/*'].map((from) => ({ from, group: 'protocol/host canonicalisation', defined: true, to: HOST_DEST })),
  ...['/<slug>/amp/', '/amp/', '/amp/?bpa_page=bookingpress_download&*'].map((from) => ({ from, group: 'AMP', defined: true, to: from === '/<slug>/amp/' ? '/<slug>/' : '/' })),
  // ZANETA_DECISION (2026-09-29): the three evidenced BookingPress AMP URLs resolve in one hop to the surviving booking page.
  ...['/thank-you/amp/', '/my-bookings/amp/', '/appointment-cancellation-confirmation/amp/'].map((from) => ({ from, group: 'AMP booking', defined: true, to: '/book-appointment/' })),
  ...['/services/hair-raiser-organic/', '/collections-nitro-coffee/', '/services/peru-organic/', '/services/ethiopia-yirgacheffe-organic/', '/services/guatemala-organic/',
    '/services/organic-hibiscus-tea/', '/services/mango-tea/', '/services/espresso-organic-nitro-coffee/', '/services/passion-fruit-tea/',
    '/services/green-citrus-nitro-tea/', '/services/cascara-coffee-cherry-tea/'].map((from) => ({ from, group: 'legacy plugin', defined: false, to: 'https://www.nitrocoffee.store/x' })),
  ...['/contact', '/hot-nitro-coffee', '/nitro-cold-brew', '/a-touch-of-vanilla-to-your-nitro-coffee', '/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health', '/coffee-trend-dominate-2018']
    .map((from) => ({ from, group: 'slash normalisation', defined: false, to: '/about/' })),
];
// Preservation evidence (03-forensic doc: "All 22 nitrocoffee.store links" must survive on /products-2/); immutable minimum.
const PRODUCTS2_MIN_STORE_LINKS = 22;

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
// Only an explicit set of Amazon-controlled registrable domains counts (lookalikes such as amazon.attacker.com do not).
const AMAZON_DOMAINS = ['amazon.com', 'amzn.to', 'amzn.com'];
const isAmazonHost = (h) => AMAZON_DOMAINS.some((d) => h === d || h.endsWith('.' + d));
const isStoreHost = (h) => h === 'nitrocoffee.store' || h.endsWith('.nitrocoffee.store');
const hostOf = (href, fromPath, test) => {
  let u; try { u = new URL(href.trim(), ORIGIN + fromPath); } catch { return false; }
  return /^https?:$/.test(u.protocol) && test(u.hostname.toLowerCase());
};
// Commerce destinations are compared as a deduplicated set of normalised URLs (lowercase host, no fragment, no trailing
// slash), never as raw anchor counts: repeating one URL N times must not satisfy an N-link contract.
export const normalizeDestination = (href, fromPath) => {
  let u; try { u = new URL(href.trim(), ORIGIN + fromPath); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  u.hash = '';
  return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, '') || '/'}${u.search}`;
};
const uniqueDestinations = (hrefs, fromPath, test) =>
  new Set(hrefs.filter((h) => hostOf(h, fromPath, test)).map((h) => normalizeDestination(h, fromPath)).filter(Boolean));

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
  for (const req of REQUIRED_REDIRECTS) {
    const have = rules.find((r) => r.from === req.from);
    if (!have) F.add('T2', 'required-redirect-missing', INV, req.from, `required ${req.group} redirect from ${req.from} is not in the register`);
    else if (req.defined && have.state !== 'defined') F.add('T2', 'required-redirect-undecided', INV, req.from, `required ${req.group} redirect ${have.id} must be state "defined"`);
    else if (req.defined && have.to !== req.to) F.add('T2', 'required-redirect-destination', INV, req.from, `required ${req.group} redirect ${have.id} must go to ${req.to}, register has ${have.to}`);
  }
  const seenId = new Set(); const seenFrom = new Set();
  for (const r of rules) {
    if (seenId.has(r.id)) F.add('T2', 'duplicate-id', INV, r.from, `duplicate redirect id ${r.id}`); seenId.add(r.id);
    if (seenFrom.has(r.from)) F.add('T2', 'duplicate-source', INV, r.from, 'duplicate redirect source'); seenFrom.add(r.from);
    if (r.status !== 301) F.add('T2', 'non-301', INV, r.from, `redirect status must be 301, got ${r.status}`);
    if (r.state === 'defined' && (r.to == null || r.to === '')) F.add('T2', 'defined-without-destination', INV, r.from, `defined redirect ${r.id} has no destination`);
    if (r.state !== 'defined' && r.to != null) F.add('T2', 'pending-with-destination', INV, r.from, `${r.state} redirect ${r.id} must not carry a destination`);
    if (!['defined', 'pending-decision', 'deliberate-404', 'dropped'].includes(r.state)) F.add('T2', 'unknown-state', INV, r.from, `redirect ${r.id} has unknown state ${r.state}`);
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
  // non-defined entries (pending-decision, deliberate-404, dropped) must never be emitted as executable redirects
  const pendings = rules.filter((r) => r.state !== 'defined');
  for (const [rel, text] of textFiles) {
    const isRedirectArtifact = rel === '.htaccess' || rel === '_redirects' || /(^|\/)redirects?\.(json|txt|conf)$/.test(rel);
    if (!isRedirectArtifact) continue;
    for (const r of pendings) if (text.includes(r.from)) F.add('T2', 'pending-emitted', INV, r.from, `${r.state} redirect ${r.id} appears in built redirect artifact dist/${rel}`);
  }
  for (const p of pages.values()) if (p.metaRefresh) F.add('T2', 'meta-refresh-redirect', INV, p.path, 'page uses <meta http-equiv="refresh">; redirects must be server-side 301s, never emitted as HTML');

  // ---------- T5 commerce-destination inventory contract (ZANETA_DECISION 2026-09-29) ----------
  // The exact historical Amazon/store destination sets are not in the repository yet. Until a Stage 6 approved source
  // populates config.commerceInventory.pages, this is migration-remaining: foundation reports it, strict blocks.
  {
    const invPages = config.commerceInventory?.pages ?? {};
    const need = [['/products/', 'amazon'], ['/products/', 'store'], ['/products-2/', 'store']];
    const minFor = (p, k) => (k === 'store' ? (isP2(p) ? Math.max(entryByPath.get(p)?.minStoreLinks ?? 0, PRODUCTS2_MIN_STORE_LINKS) : entryByPath.get(p)?.minStoreLinks ?? 0) : entryByPath.get(p)?.minAmazonLinks ?? 0);
    for (const [p, kind] of need) {
      const list = invPages[p]?.[kind] ?? [];
      const norm = new Set(list.map((u) => normalizeDestination(String(u), p)).filter(Boolean));
      const test = kind === 'amazon' ? isAmazonHost : isStoreHost;
      if (list.length === 0) F.add('T5', 'commerce-inventory-missing', REM, p, `exact ${kind} destination inventory for ${p} is not populated (Stage 6 must supply it from an approved source)`);
      else if (norm.size < minFor(p, kind) || [...norm].some((u) => !hostOf(u, p, test))) F.add('T5', 'commerce-inventory-invalid', INV, p, `${kind} inventory for ${p} must hold >= ${minFor(p, kind)} unique destinations on the approved host set`);
    }
  }

  // ---------- T3 / T4 / T5 / T6: per built page ----------
  const articleRoutes = new Set(config.articleRoutes ?? []);
  if (articleRoutes.size === 0) F.add('T6', 'article-routes-undeclared', INV, null, 'qa config must declare the historical post routes (articleRoutes) that require Article + Person schema (Block 23)');
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
    const amazonSet = uniqueDestinations(page.hrefs, page.path, isAmazonHost);
    const storeSet = uniqueDestinations(page.hrefs, page.path, isStoreHost);
    const amazon = amazonSet.size;
    const store = storeSet.size;
    const prices = (page.text.match(/\$\s?\d[\d,]*(?:\.\d+)?/g) ?? []).length;
    if (e?.minAmazonLinks != null && amazon < e.minAmazonLinks) F.add('T5', 'amazon-links-min', ck, page.path, `expected >= ${e.minAmazonLinks} unique Amazon destinations, found ${amazon}`);
    if (e?.maxAmazonLinks != null && amazon > e.maxAmazonLinks) F.add('T5', 'amazon-links-max', INV, page.path, `expected <= ${e.maxAmazonLinks} unique Amazon destinations, found ${amazon}`);
    const minStore = isP2(page.path) ? Math.max(e?.minStoreLinks ?? 0, PRODUCTS2_MIN_STORE_LINKS) : e?.minStoreLinks;
    if (minStore != null && store < minStore) F.add('T5', 'store-links-min', ck, page.path, `expected >= ${minStore} unique store destinations, found ${store}`);
    // Exact-destination preservation: the rendered deduplicated set must equal-or-contain the authoritative inventory.
    const inv = config.commerceInventory?.pages?.[page.path];
    if (inv) {
      const rendered = new Set([...amazonSet, ...storeSet]);
      const lost = [...(inv.amazon ?? []), ...(inv.store ?? [])].map((u) => normalizeDestination(u, page.path)).filter((u) => u && !rendered.has(u));
      if (lost.length) F.add('T5', 'commerce-destination-missing', ck, page.path, `${lost.length} preserved commerce destination(s) missing, e.g. ${lost.slice(0, 3).join(' | ')}`);
    }
    if (e?.minPriceStrings != null && prices < e.minPriceStrings) F.add('T5', 'price-strings-min', ck, page.path, `expected >= ${e.minPriceStrings} price strings, found ${prices}`);

    // T6 schema
    const types = [];
    for (const block of page.jsonLd) {
      try { types.push(...jsonLdTypes(JSON.parse(block))); } catch { F.add('T6', 'jsonld-invalid', INV, page.path, 'JSON-LD block does not parse'); }
    }
    // Block 23 (Issue #64): Article + Person on the historical post routes, none elsewhere. Unconditional (config lists the routes).
    {
      const nodes = [];
      const walk = (n) => { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object') { if (n['@type']) nodes.push(n); Object.values(n).forEach(walk); } };
      for (const block of page.jsonLd) { try { walk(JSON.parse(block)); } catch { /* reported above as jsonld-invalid */ } }
      const isoDate = (v) => { const m = typeof v === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(v); if (!m) return false; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]; };
      const of = (t) => nodes.filter((n) => [].concat(n['@type']).includes(t));
      const arts = of('Article'); const people = of('Person');
      if (articleRoutes.has(page.path)) {
        if (arts.length !== 1) F.add('T6', 'article-schema-count', ck, page.path, `exactly one Article required on a historical post, found ${arts.length}`);
        if (people.length !== 1) F.add('T6', 'person-schema-count', ck, page.path, `exactly one Person required on a historical post, found ${people.length}`);
        if (arts.length === 1 && people.length === 1) {
          const a = arts[0]; const pe = people[0];
          if (typeof pe['@id'] !== 'string' || !pe['@id'] || a.author?.['@id'] !== pe['@id']) F.add('T6', 'article-author-link', ck, page.path, 'Article.author must be an @id reference to the page\'s Person entity');
          if (typeof pe.name !== 'string' || !pe.name.trim()) F.add('T6', 'person-name-missing', ck, page.path, 'Person.name is required');
          for (const k of ['headline', 'datePublished']) if (typeof a[k] !== 'string' || !a[k].trim()) F.add('T6', 'article-field-missing', ck, page.path, `Article.${k} is required`);
          if (a.datePublished != null && !isoDate(a.datePublished)) F.add('T6', 'article-field-invalid', ck, page.path, 'Article.datePublished must be an ISO date');
          if (a.dateModified != null && !isoDate(a.dateModified)) F.add('T6', 'article-field-invalid', ck, page.path, 'Article.dateModified must be an ISO date');
        }
      } else if (arts.length || people.length) F.add('T6', 'article-schema-unexpected', INV, page.path, 'Article/Person schema is only allowed on the historical post routes (archives and other pages must not carry it)');
    }
    for (const t of e?.schema ?? []) if (!types.includes(t)) F.add('T6', 'schema-missing', ck, page.path, `JSON-LD @type ${t} required by manifest`);
    // §13.2 T6: site-wide and per-page schema are required on every built page whether or not the manifest declares them.
    for (const t of [...SITE_WIDE_SCHEMA, ...(config.requiredSiteWideSchema ?? [])]) if (!types.includes(t)) F.add('T6', 'schema-sitewide-missing', ck, page.path, `JSON-LD @type ${t} is required site-wide (master plan §13.2 T6)`);
    for (const t of [...PER_PAGE_SCHEMA, ...(config.requiredPageSchema ?? [])]) if (!types.includes(t)) F.add('T6', 'schema-page-missing', ck, page.path, `JSON-LD @type ${t} is required on every page (master plan §13.2 T6)`);
  }
  for (const [title, group] of titleGroups) {
    // Exceptions are pair-scoped: an entry that is an array is one approved duplicate group; a flat string list is one legacy group.
    const exc = rules_.titleUniquenessException ?? [];
    const groups = exc.some((e) => Array.isArray(e)) ? exc.filter(Array.isArray) : [exc];
    if (group.length > 1 && !groups.some((g) => group.every((p) => g.includes(p))))
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
      // Master plan §7.6: any `?p=` post-ID URL not already listed in the manifest is DO-NOT-GENERATE.
      const hit = dngQuery.find(({ re }) => re.test(n.path + n.search)) ?? (n.url.searchParams.has('p') && !known.has(n.path + n.search) ? { g: '?p=<post-id> (master plan §7.6)' } : null);
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

  // ---------- T7 required-image manifest (Block 24, Issue #66) ----------
  // qa/t7-image-manifest.json lists the alliance + evidenced ranking images verbatim from preserved evidence. A missing
  // binary is migration-remaining (foundation reports it, strict blocks); a malformed contract or a non-image file at a
  // manifested path is an invariant. The incomplete ranking list stays an explicit evidence-gap finding until declared complete.
  {
    const man = config.imageManifest;
    const list = Array.isArray(man?.images) ? man.images : [];
    const prefix = '/wp-content/uploads/';
    if (list.length === 0) F.add('T7', 'manifest-undeclared', INV, null, 'T7 required-image manifest (qa/t7-image-manifest.json) is absent or empty');
    const seen = new Set();
    const lower = new Map([...files.keys()].map((k) => [k.toLowerCase(), k]));
    for (const img of list) {
      const ip = img?.path;
      if (typeof ip !== 'string' || !ip.startsWith(prefix) || /[?#\s]/.test(ip) || ip.endsWith('/') || !['alliance', 'ranking'].includes(img.group)) { F.add('T7', 'manifest-entry-invalid', INV, typeof ip === 'string' ? ip : null, 'manifest entry needs a clean /wp-content/uploads/ file path and group alliance|ranking'); continue; }
      if (seen.has(ip)) { F.add('T7', 'manifest-duplicate', INV, ip, 'manifest lists this required image more than once'); continue; }
      seen.add(ip);
      const rel = ip.slice(1);
      const abs = files.get(rel);
      if (!abs) {
        const near = lower.get(rel.toLowerCase());
        if (near) F.add('T7', 'required-image-path-case', INV, ip, `a file exists only at differently-cased path /${near}; the required path must match exactly`);
        else F.add('T7', 'required-image-missing', REM, ip, `required ${img.group} image is not in the build at its preserved path (binary not supplied)`);
        continue;
      }
      const ext = path.extname(rel).toLowerCase();
      const buf = fs.readFileSync(abs);
      const ok = (ext === '.png' && validPng(buf)) || ((ext === '.jpg' || ext === '.jpeg') && validJpeg(buf));
      if (!ok) F.add('T7', 'required-image-invalid', INV, ip, 'file at the required path is empty, truncated, or is not a structurally complete PNG/JPEG matching its extension');
    }
    const alliance = list.filter((i) => i?.group === 'alliance').length;
    if (list.length > 0 && alliance !== ALLIANCE_REQUIRED) F.add('T7', 'alliance-count', INV, null, `manifest lists ${alliance} alliance images; the master plan requires ${ALLIANCE_REQUIRED}`);
    const rankingListed = list.filter((i) => i?.group === 'ranking').length;
    const rankingExpected = config.rankingExpectedCount ?? RANKING_EVIDENCED_TOTAL;
    if (man?.rankingList?.complete !== true || rankingListed < rankingExpected) F.add('T7', 'ranking-list-incomplete', REM, null, 'the full ranking-image list is not in preserved evidence (master plan §9.3: ~20 image URLs rank; only the manifested subset is identifiable) — evidence must be supplied, not inferred');
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
  // Statically assigned external script URLs (`el.src = '…'`, `setAttribute('src', '…')`, `importScripts('…')`, `import '…'`, `… from '…'`, import maps) in inline and bundled JS.
  const DYNAMIC_SRC = /(?:\.src\s*=|setAttribute\(\s*['"]src['"]\s*,|importScripts\(|import\(|\b(?:import|from)\s*|\.(?:appendChild|write)\([^)]*?src\s*=\s*)\s*['"`]((?:https?:)?\/\/[^'"`\s]+)['"`]/gi;
  const flagHost = (url, where) => {
    let u; try { u = new URL(url, 'https://' + [...HOSTS][0]); } catch { return; }
    if (!HOSTS.has(u.hostname) && !allowed.has(u.hostname.toLowerCase())) F.add('T11', 'unexpected-script-host', INV, where, `dynamically loaded third-party script host ${u.hostname} is not in the allowlist`);
  };
  // Import maps (JSON body): every mapped specifier target is a module URL.
  const importMapUrls = (code) => {
    if (!code.trim().startsWith('{')) return [];
    let j; try { j = JSON.parse(code); } catch { return []; }
    const out = []; const walk = (v) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(j.imports); walk(j.scopes);
    return out.filter((v) => /^(?:https?:)?\/\//.test(v));
  };
  const checkDynamicScripts = (code, where) => {
    for (const url of importMapUrls(code)) flagHost(url, where);
    for (const m of code.matchAll(DYNAMIC_SRC)) flagHost(m[1], where);
  };
  for (const [rel, abs] of files) if (/\.(m?js)$/i.test(rel)) checkDynamicScripts(fs.readFileSync(abs, 'utf8'), '/' + rel);
  for (const page of [...pages.values(), ...(notFound ? [{ ...notFound, path: '/404.html' }] : [])]) {
    for (const src of page.scriptSrcs) {
      let u; try { u = new URL(src, ORIGIN + page.path); } catch { F.add('T11', 'unparseable-script-src', INV, page.path, `script src ${src}`); continue; }
      if (!HOSTS.has(u.hostname) && !allowed.has(u.hostname.toLowerCase())) F.add('T11', 'unexpected-script-host', INV, page.path, `third-party script host ${u.hostname} is not in the allowlist`);
    }
    for (const body of page.inlineScripts ?? []) checkDynamicScripts(body, page.path);
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
