// Issue #170: fail-closed privacy probe for a private hosted review.
// Usage: node scripts/check-private-preview.mjs <url> [<url> ...]
// Each URL must be anonymously UNREACHABLE: HTTP 401, or a redirect to a vercel.com login/SSO page.
// Anything else (2xx, 404, 5xx, network error, no URLs given) fails, because "could not prove it is
// private" is treated as "assume public". This is a probe, not access control: the access control is
// Vercel Authentication set to "All Deployments". Pass the default, preview and per-commit URLs.
import { pathToFileURL } from 'node:url';

export const classify = ({ status, location }) => {
  if (status === 401) return { ok: true, why: 'HTTP 401 (login required)' };
  if ([301, 302, 303, 307, 308].includes(status) && location) {
    try {
      const host = new URL(location).hostname;
      if (host === 'vercel.com' || host.endsWith('.vercel.com')) return { ok: true, why: `redirect to ${host}` };
    } catch { /* fall through */ }
  }
  return { ok: false, why: `HTTP ${status}${location ? ` -> ${location}` : ''} is NOT a login wall` };
};

export const probe = async (urls, fetchImpl = fetch) => {
  if (!urls.length) return [{ url: '(none)', ok: false, why: 'no URLs supplied; refusing to pass' }];
  const out = [];
  for (const url of urls) {
    let u;
    try { u = new URL(url); } catch { out.push({ url, ok: false, why: 'not a valid URL' }); continue; }
    if (u.protocol !== 'https:') { out.push({ url, ok: false, why: 'URL must be https' }); continue; }
    try {
      const res = await fetchImpl(u.href, { redirect: 'manual', headers: { 'user-agent': 'bonafide-private-check' } });
      out.push({ url, ...classify({ status: res.status, location: res.headers.get('location') }) });
    } catch (e) {
      out.push({ url, ok: false, why: `request failed (${e.message}); cannot prove private` });
    }
  }
  return out;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const results = await probe(process.argv.slice(2));
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.url}  ${r.why}`);
  if (!results.every((r) => r.ok)) {
    console.error('PRIVATE CHECK FAILED: treat these URLs as public. Do not share them; fix Vercel Authentication first.');
    process.exit(1);
  }
}
