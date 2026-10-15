// Internal link graph check over the built dist/ (Block 56, Issue #128).
// Every local anchor and resource reference must resolve to a generated page or a byte-present file.
// Outbound hosts, mailto:/tel:/javascript:/data: and fragment-only links are out of scope; no network is used.
// Fragment ids are not verified (a missing id never breaks routing); query strings never affect resolution.
import fs from 'node:fs';
import path from 'node:path';
import { scanDist } from '../qa/lib/scan.mjs';

const ORIGIN = 'https://bonafidenitro.com';
const HOSTS = new Set(['bonafidenitro.com', 'www.bonafidenitro.com']);

export const resolveInternal = (ref, fromPath) => {
  const h = ref.trim();
  if (!h || h.startsWith('#') || /^(mailto:|tel:|javascript:|data:|sms:)/i.test(h)) return null;
  let u;
  try { u = new URL(h, ORIGIN + fromPath); } catch { return { invalid: true }; }
  if (!/^https?:$/.test(u.protocol) || !HOSTS.has(u.hostname)) return null;
  // Encoded separators (%2F, %5C) stay encoded: a browser requests them literally, so they must not match a real directory path.
  try { return { path: u.pathname.split(/(%2f|%5c)/i).map((s, i) => (i % 2 ? s : decodeURIComponent(s))).join('') }; } catch { return { invalid: true }; }
};

export const checkInternalLinks = (distDir) => {
  const { files, pages, notFound } = scanDist(distDir);
  const sources = [...pages.values()];
  if (notFound) sources.push({ ...notFound, path: '/404.html' });
  const findings = [];
  let checked = 0;
  for (const page of sources) {
    const refs = [...page.hrefs.map((r) => ['a', r]), ...page.resourceRefs.map((r) => ['resource', r])];
    for (const [kind, ref] of refs) {
      const t = resolveInternal(ref, page.path === '/404.html' ? '/' : page.path);
      if (!t) continue;
      checked++;
      if (t.invalid) { findings.push({ from: page.path, ref, why: 'unparseable internal URL' }); continue; }
      const p = t.path;
      const ext = /\.[a-z0-9]+$/i.test(p);
      const ok = p.endsWith('/') ? pages.has(p) : files.has(p.slice(1));
      if (!ok) findings.push({ from: page.path, ref, why: !p.endsWith('/') && !ext ? 'route without trailing slash' : `target ${p} not generated (${kind})` });
    }
  }
  return { pages: sources.length, checked, findings };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = path.resolve(process.argv[2] ?? 'dist');
  if (!fs.existsSync(dist)) { console.error('dist/ missing — run `npm run build` first'); process.exit(2); }
  const r = checkInternalLinks(dist);
  if (r.findings.length) {
    for (const f of r.findings) console.error(`${f.from}: ${f.ref} -> ${f.why}`);
    console.error(`${r.findings.length} unresolved internal link(s) across ${r.pages} page(s)`);
    process.exit(1);
  }
  console.log(`internal links OK: ${r.checked} local reference(s) across ${r.pages} page(s) resolve`);
}
