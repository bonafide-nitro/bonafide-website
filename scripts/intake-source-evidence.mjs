#!/usr/bin/env node
// Block 61 (Issue #139): offline, read-only source-evidence intake.
// Verifies a human-supplied saved HTML page or asset (image/PDF) against a known route/path and
// inventories what it contains FOR HUMAN REVIEW. It never writes into src/ or public/, never
// executes or copies markup/scripts into pages, makes no network request, and changes no QA state.
//
//   node scripts/intake-source-evidence.mjs --route /howtobuy/ --html saved.html [--output report.json]
//   node scripts/intake-source-evidence.mjs --path /wp-content/uploads/2022/04/x.jpg --asset x.jpg [--output report.json]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseHtml, normText, decodeEntities } from '../qa/lib/html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MAX_BYTES = 20 * 1024 * 1024;
const SNIPPET = 160;
const SNIPPET_MAX = 40;

export class IntakeError extends Error {}

// Routes that exist in this repo: every src/pages/**/index.astro directory, plus "/".
export const knownRoutes = (root = ROOT) => {
  const base = path.join(root, 'src', 'pages');
  const out = [];
  const walk = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}${e.name}/`);
      else if (e.name === 'index.astro') out.push(rel);
    }
  };
  walk(base, '/');
  return out.sort();
};

const normRoute = (r) => {
  let p = String(r ?? '').trim();
  if (!p.startsWith('/')) p = `/${p}`;
  return p.endsWith('/') ? p : `${p}/`;
};

const attrsOf = (raw) => {
  const a = {};
  for (const m of raw.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    a[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return a;
};

const pathOf = (url) => {
  try {
    return new URL(url, 'https://bonafidenitro.com').pathname;
  } catch {
    return null;
  }
};

const classifyLink = (href) => {
  const h = href.trim();
  if (/^(javascript|data|vbscript):/i.test(h)) return 'unsafe-scheme';
  if (/^mailto:/i.test(h)) return 'mailto';
  if (/^tel:/i.test(h)) return 'tel';
  if (h.startsWith('#')) return 'fragment';
  if (!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(h)) return 'relative';
  let host;
  try {
    host = new URL(h.startsWith('//') ? `https:${h}` : h).hostname.toLowerCase();
  } catch {
    return 'invalid';
  }
  if (host === 'bonafidenitro.com' || host === 'www.bonafidenitro.com') return 'internal';
  return 'external';
};

const hostOf = (href) => {
  try {
    return new URL(href.startsWith('//') ? `https:${href}` : href).hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const inspectHtml = (html, route, routes = knownRoutes()) => {
  const wanted = normRoute(route);
  const flags = [];
  if (!routes.includes(wanted)) flags.push({ code: 'route-unknown', detail: `${wanted} is not a route in src/pages` });

  // Comments and whole script/style elements (bodies included, even if unterminated) are removed
  // before any visible-text extraction, so script bodies never reach the report.
  const bare = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(script|style)\b[\s\S]*$/i, ' ');
  const parsed = parseHtml(html);
  // The shared parser reads raw markup; take title/h1 from the script-stripped copy.
  const visible = parseHtml(bare);
  const metas = [...bare.matchAll(/<meta\b([^>]*)>/gi)].map((m) => attrsOf(m[1]));
  const metaBy = (key, val) => metas.filter((m) => (m[key] ?? '').toLowerCase() === val).map((m) => m.content ?? '');
  const descriptions = metaBy('name', 'description');
  const ogUrl = metaBy('property', 'og:url');
  const shortlinks = [...bare.matchAll(/<link\b([^>]*)>/gi)]
    .map((m) => attrsOf(m[1]))
    .filter((l) => (l.rel ?? '').toLowerCase() === 'shortlink')
    .map((l) => l.href ?? '');

  // Route association: every self-identifying URL in the page must resolve to the requested route.
  const identifiers = [
    ...parsed.canonicals.map((v) => ({ kind: 'canonical', value: v })),
    ...ogUrl.map((v) => ({ kind: 'og:url', value: v })),
  ].map((i) => ({ ...i, path: pathOf(i.value) }));
  const routeEvidence = identifiers.length === 0 ? 'none' : identifiers.every((i) => i.path && normRoute(i.path) === wanted) ? 'match' : 'mismatch';
  if (routeEvidence === 'none') flags.push({ code: 'route-unverified', detail: 'no canonical or og:url to tie this file to the route; human must confirm' });
  if (routeEvidence === 'mismatch') flags.push({ code: 'route-mismatch', detail: `canonical/og:url do not resolve to ${wanted}` });
  if (parsed.canonicals.length > 1) flags.push({ code: 'multiple-canonicals', detail: String(parsed.canonicals.length) });
  if (descriptions.length === 0) flags.push({ code: 'no-meta-description', detail: 'none present in the file; do not invent one' });
  if (descriptions.length > 1) flags.push({ code: 'multiple-meta-descriptions', detail: String(descriptions.length) });
  if (visible.title === null) flags.push({ code: 'no-title', detail: '' });
  if (visible.h1Count !== 1) flags.push({ code: 'h1-count', detail: String(visible.h1Count) });
  if (parsed.robots.some((r) => r.includes('noindex'))) flags.push({ code: 'noindex', detail: parsed.robots.join(',') });

  const anchors = [...bare.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    attrs: attrsOf(m[1]),
    text: normText(m[2].replace(/<[^>]*>/g, ' ')),
  }));
  const links = anchors
    .filter((a) => a.attrs.href !== undefined)
    .map((a) => {
      const href = a.attrs.href;
      const cls = classifyLink(href);
      return { href, text: a.text.slice(0, SNIPPET), class: cls, host: cls === 'external' || cls === 'internal' ? hostOf(href) : null };
    });
  if (links.some((l) => l.class === 'unsafe-scheme')) flags.push({ code: 'unsafe-link-scheme', detail: 'javascript:/data: link present; not carried over' });

  const images = [...bare.matchAll(/<img\b([^>]*)>/gi)].map((m) => {
    const a = attrsOf(m[1]);
    const src = a.src ?? a['data-src'] ?? null;
    return {
      src,
      path: src && !/^data:/i.test(src) ? pathOf(src) : null,
      altPresent: 'alt' in a,
      alt: a.alt ?? null,
    };
  });
  const missingAlt = images.filter((i) => !i.altPresent).length;
  if (missingAlt) flags.push({ code: 'images-without-alt-attribute', detail: `${missingAlt}; absent alt is not evidence of empty alt` });

  const scripts = parsed.scriptSrcs.length + parsed.inlineScripts.length + parsed.jsonLd.length;
  const iframes = [...bare.matchAll(/<iframe\b/gi)].length;
  const forms = [...bare.matchAll(/<form\b([^>]*)>/gi)].map((m) => ({ action: attrsOf(m[1]).action ?? null }));
  if (scripts) flags.push({ code: 'scripts-present', detail: `${scripts}; inventoried only, never copied` });
  if (iframes) flags.push({ code: 'iframes-present', detail: `${iframes}; inventoried only` });

  const headings = [...bare.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({
    level: Number(m[1]),
    text: normText(m[2].replace(/<[^>]*>/g, ' ')).slice(0, SNIPPET),
  }));
  const textBlocks = [...bare.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => normText(m[2].replace(/<[^>]*>/g, ' ')))
    .filter(Boolean)
    .slice(0, SNIPPET_MAX)
    .map((t) => t.slice(0, SNIPPET));

  const externalHosts = {};
  for (const l of links) if (l.class === 'external' && l.host) externalHosts[l.host] = (externalHosts[l.host] ?? 0) + 1;

  return {
    kind: 'html',
    route: wanted,
    routeKnown: routes.includes(wanted),
    routeEvidence,
    identifiers,
    shortlinks,
    title: visible.title,
    metaDescriptions: descriptions,
    h1: visible.h1s,
    headings,
    links,
    externalHosts,
    images,
    forms,
    scriptCount: scripts,
    iframeCount: iframes,
    textSnippets: textBlocks,
    flags,
    review: 'Inventory only. Nothing is copied into pages; a human must confirm provenance before any later Block imports text, links or alt.',
  };
};

const MAGIC = [
  { ext: ['.jpg', '.jpeg'], type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: ['.png'], type: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: ['.webp'], type: 'image/webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { ext: ['.gif'], type: 'image/gif', test: (b) => /^GIF8[79]a/.test(b.subarray(0, 6).toString('latin1')) },
  { ext: ['.pdf'], type: 'application/pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
];

export const inspectAsset = (buf, expectedPath, root = ROOT) => {
  const flags = [];
  const exp = String(expectedPath ?? '');
  if (!exp.startsWith('/') || exp.includes('..') || exp.includes('\\') || exp.includes('\0')) {
    throw new IntakeError(`--path must be an absolute site path without traversal: ${JSON.stringify(exp)}`);
  }
  const ext = path.posix.extname(exp).toLowerCase();
  const sniffed = MAGIC.find((m) => m.test(buf));
  const declared = MAGIC.find((m) => m.ext.includes(ext));
  if (!declared) flags.push({ code: 'unsupported-extension', detail: ext || '(none)' });
  if (!sniffed) flags.push({ code: 'unrecognised-content', detail: 'bytes match no supported image/PDF signature' });
  else if (declared && sniffed !== declared) flags.push({ code: 'content-extension-mismatch', detail: `${ext} but content is ${sniffed.type}` });
  const onDisk = path.join(root, 'public', ...exp.split('/').filter(Boolean));
  const existing = fs.existsSync(onDisk) ? fs.readFileSync(onDisk) : null;
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  let manifest = null;
  try {
    const m = JSON.parse(fs.readFileSync(path.join(root, 'qa', 't7-image-manifest.json'), 'utf8'));
    manifest = (m.images ?? []).some((i) => i.path === exp);
  } catch {
    manifest = null;
  }
  const inRepo = existing ? (existing.equals(buf) ? 'identical' : 'different') : 'absent';
  if (inRepo === 'different') flags.push({ code: 'differs-from-repo-binary', detail: 'repo already has a different file at this path' });
  return {
    kind: 'asset',
    path: exp,
    bytes: buf.length,
    sha256,
    detectedType: sniffed?.type ?? null,
    inRepo,
    inT7Manifest: manifest,
    flags,
    review: 'Verification only. Placement, order and alt text are not evidenced by a file alone.',
  };
};

const realish = (p) => {
  // realpath of the deepest existing ancestor, plus the not-yet-existing remainder.
  const rest = [];
  let cur = path.resolve(p);
  while (!fs.existsSync(cur) && !isLink(cur)) {
    rest.unshift(path.basename(cur));
    const up = path.dirname(cur);
    if (up === cur) break;
    cur = up;
  }
  return path.join(fs.realpathSync(cur), ...rest);
};

const isLink = (p) => {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};

const refuseUnsafeOutput = (out, root = ROOT) => {
  const abs = path.resolve(out);
  if (isLink(abs)) throw new IntakeError('refusing to write the report through a symbolic link');
  const real = realish(abs);
  for (const d of ['src', 'public', 'qa', 'docs']) {
    const protectedDirs = [path.join(root, d), fs.existsSync(path.join(root, d)) ? fs.realpathSync(path.join(root, d)) : null].filter(Boolean);
    for (const dir of protectedDirs) {
      if (abs.startsWith(dir + path.sep) || real.startsWith(dir + path.sep)) {
        throw new IntakeError(`refusing to write the report inside ${d}/; choose a path outside the repo content`);
      }
    }
  }
  return real;
};

const readInput = (file) => {
  const st = fs.lstatSync(file);
  if (st.isSymbolicLink()) throw new IntakeError('refusing a symbolic link input');
  if (!st.isFile()) throw new IntakeError('input is not a regular file');
  if (st.size > MAX_BYTES) throw new IntakeError(`input exceeds ${MAX_BYTES} bytes`);
  return fs.readFileSync(file);
};

const parseArgs = (argv) => {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!['--route', '--html', '--path', '--asset', '--output'].includes(k)) throw new IntakeError(`unknown argument: ${k}`);
    if (argv[i + 1] === undefined) throw new IntakeError(`${k} needs a value`);
    o[k.slice(2)] = argv[++i];
  }
  return o;
};

export const run = (argv, root = ROOT) => {
  const o = parseArgs(argv);
  const html = o.route !== undefined || o.html !== undefined;
  const asset = o.path !== undefined || o.asset !== undefined;
  if (html === asset) throw new IntakeError('use either --route + --html, or --path + --asset');
  let report;
  if (html) {
    if (!o.route || !o.html) throw new IntakeError('--route and --html are both required');
    const buf = readInput(o.html);
    if (buf.includes(0)) throw new IntakeError('input looks binary; use --path/--asset for images and PDFs');
    report = inspectHtml(buf.toString('utf8'), o.route, knownRoutes(root));
  } else {
    if (!o.path || !o.asset) throw new IntakeError('--path and --asset are both required');
    report = inspectAsset(readInput(o.asset), o.path, root);
  }
  report.generatedFrom = path.basename(o.html ?? o.asset);
  const json = JSON.stringify(report, null, 2);
  if (o.output) fs.writeFileSync(refuseUnsafeOutput(o.output, root), `${json}\n`);
  return { report, json };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { report, json } = run(process.argv.slice(2));
    const parsedOut = process.argv.includes('--output');
    if (parsedOut) console.log(`ok: ${report.kind} intake, ${report.flags.length} flag(s): ${report.flags.map((f) => f.code).join(', ') || 'none'}`);
    else console.log(json);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(2);
  }
}
