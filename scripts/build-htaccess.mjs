// Generates the Apache redirect artifact from src/data/redirects.yaml (master plan §10.4, Block 20 / Issue #58).
//
//   node scripts/build-htaccess.mjs           write deploy/apache/redirects.htaccess
//   node scripts/build-htaccess.mjs --check   fail if the committed artifact differs from a fresh generation
//
// Only `state: defined` rules are emitted; `pending-decision`, `deliberate-404` and `dropped` rules are never emitted. Output is a pure function of the
// register and site.yaml (no timestamps, no hashes, stable ordering) so regeneration is byte-stable.
// Nothing here deploys anything: the artifact is a build product for a later, separately approved deployment Block.
import fs from 'node:fs';
import path from 'node:path';
import { loadRedirects, loadBaseline, loadSite } from '../src/lib/data.mjs';

export const ARTIFACT_PATH = 'deploy/apache/redirects.htaccess';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hostRegex = (host) => `^${escapeRegex(host)}(:[0-9]+)?$`;

// Apache needs non-ASCII bytes percent-encoded in a substitution; the NE flag then stops it re-escaping the '%'.
const encodeTarget = (to) => {
  if (/[$\s]|%(?![0-9A-Fa-f]{2})/.test(to)) throw new Error(`unsafe redirect destination: ${to}`);
  return [...Buffer.from(to, 'utf8')].map((b) => (b > 0x20 && b < 0x7f ? String.fromCharCode(b) : '%' + b.toString(16).toUpperCase().padStart(2, '0'))).join('');
};

// Group order is the match order: specific before generic, canonicalisation last. Path rules carry an absolute
// https://<canonical host> destination and no host condition, so a request on http:// or www. is still one hop.
const GROUP = { query: 0, exact: 1, generic: 2, canonical: 3 };

const classify = (r) => {
  if (r.type === 'canonicalisation') return 'canonical';
  if (r.type === 'pattern' && r.from.includes('<slug>')) return 'generic';
  if (r.type === 'pattern' && r.from.includes('?')) return 'query';
  if (r.type === 'exact' || r.type === 'external') return 'exact';
  throw new Error(`rule ${r.id}: type ${r.type} is not supported by the Apache generator`);
};

const buildRule = (r, origin) => {
  const kind = classify(r);
  const dest = r.to.startsWith('/') ? origin + r.to : r.to;
  const target = encodeTarget(dest);
  const external = !r.to.startsWith('/');
  if (kind === 'canonical') {
    const m = r.from.match(/^(https?):\/\/([^/*]+)\/\*$/);
    if (!m || r.to !== `${origin}/*`) throw new Error(`rule ${r.id}: unsupported canonicalisation shape`);
    return { id: r.id, kind, conds: [`%{HTTPS} ${m[1] === 'https' ? '=on' : '!=on'}`, `%{HTTP_HOST} ${hostRegex(m[2])} [NC]`], pattern: '^', target: `${origin}%{REQUEST_URI}`, flags: 'R=301,L,NE' };
  }
  if (kind === 'generic') {
    const m = r.from.match(/^\/<slug>\/amp\/$/);
    if (!m || r.to !== '/<slug>/') throw new Error(`rule ${r.id}: unsupported slug pattern`);
    return { id: r.id, kind, conds: [], pattern: '^([^/]+)/amp/$', target: `${origin}/$1/`, flags: 'R=301,L' };
  }
  if (kind === 'query') {
    const m = r.from.match(/^(\/[^?*]*)\?([^*]*&)\*$/);
    if (!m) throw new Error(`rule ${r.id}: unsupported query pattern`);
    return { id: r.id, kind, conds: [`%{QUERY_STRING} ^${escapeRegex(m[2])}`], pattern: `^${escapeRegex(m[1].slice(1))}$`, target: `${target}?`, flags: 'R=301,L,NE' };
  }
  if (/[*<?]/.test(r.from)) throw new Error(`rule ${r.id}: exact source contains a wildcard`);
  return { id: r.id, kind, conds: [], pattern: `^${escapeRegex(r.from.slice(1))}$`, target, flags: external ? 'R=301,L,NE,QSD' : 'R=301,L' };
};

export const buildRules = (redirects = loadRedirects(), site = loadSite(), baseline = loadBaseline()) => {
  const protectedPaths = new Set(baseline.urls.map((u) => u.path));
  const defined = redirects.filter((r) => r.state === 'defined');
  const seen = new Set();
  for (const r of defined) {
    if (r.status !== 301) throw new Error(`rule ${r.id}: only 301 is allowed`);
    if (seen.has(r.from)) throw new Error(`rule ${r.id}: duplicate source ${r.from}`);
    seen.add(r.from);
    if (protectedPaths.has(r.from)) throw new Error(`rule ${r.id}: protected 200 URL ${r.from} must not be a redirect source`);
  }
  return defined
    .map((r, i) => ({ rule: buildRule(r, site.url), i }))
    .sort((a, b) => GROUP[a.rule.kind] - GROUP[b.rule.kind] || a.i - b.i)
    .map(({ rule }) => rule);
};

export const renderHtaccess = (rules = buildRules()) => {
  const out = [
    '# GENERATED FILE - DO NOT EDIT. Source: src/data/redirects.yaml. Regenerate: node scripts/build-htaccess.mjs',
    '# Apache (mod_rewrite) redirect rules for the static /public_html target. 301 only, one hop, `defined` rules only;',
    '# `pending-decision`, `deliberate-404` and `dropped` rules are never emitted. Order matters: specific rules first, host/protocol canonicalisation last.',
    '# Path rules carry an absolute https://bonafidenitro.com destination so http:// and www. requests are still one hop.',
    `# Rules: ${rules.length}`,
    '<IfModule mod_rewrite.c>',
    'RewriteEngine On',
  ];
  for (const r of rules) {
    out.push('', `# ${r.id}`);
    for (const c of r.conds) out.push(`RewriteCond ${c}`);
    out.push(`RewriteRule ${r.pattern} ${r.target} [${r.flags}]`);
  }
  out.push('</IfModule>', '');
  return out.join('\n');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = renderHtaccess();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(ARTIFACT_PATH) ? fs.readFileSync(ARTIFACT_PATH, 'utf8') : null;
    if (current !== text) { console.error(`${ARTIFACT_PATH} is missing or stale: run node scripts/build-htaccess.mjs`); process.exit(1); }
    console.log(`${ARTIFACT_PATH} is up to date`);
  } else {
    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    fs.writeFileSync(ARTIFACT_PATH, text);
    console.log(`wrote ${ARTIFACT_PATH}`);
  }
}
