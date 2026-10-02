// Block 12 (Issue #42): Calendly booking page. Page checks run against dist/ built WITHOUT
// PUBLIC_CALENDLY_URL (the committed default); run `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveCalendlyUrl } from '../../src/lib/calendly.mjs';
import { loadRedirects } from '../../src/lib/data.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const PAGE = 'dist/book-appointment/index.html';
const html = () => fs.readFileSync(PAGE, 'utf8').replace(/<!--[\s\S]*?-->/g, ''); // the scaffold comment is documentation, not output
const BOOKING_SOURCES = ['/my-bookings/', '/cancel-appointment/', '/cancel-payment/', '/appointment-cancellation-confirmation/', '/thank-you/'];
const AMP_SOURCES = ['/thank-you/amp/', '/my-bookings/amp/', '/appointment-cancellation-confirmation/amp/'];

test('resolveCalendlyUrl accepts only a clean https calendly.com URL with a path', () => {
  assert.equal(resolveCalendlyUrl('https://calendly.com/example-team/intro'), 'https://calendly.com/example-team/intro');
  assert.equal(resolveCalendlyUrl('  https://www.calendly.com/example-team  '), 'https://www.calendly.com/example-team');
  for (const bad of [undefined, null, '', '   ', 42, 'http://calendly.com/x/y', '/relative', 'javascript:alert(1)', 'https://u:p@calendly.com/x/y', 'https://calendly.com/', 'https://calendly.com', 'https://evilcalendly.com/x', 'https://calendly.com.evil.test/x', 'not a url']) {
    assert.equal(resolveCalendlyUrl(bad), null, String(bad));
  }
});

t('/book-appointment/: static route, self-canonical, noindex, one H1, schema, no scripts', () => {
  const h = html();
  assert.equal(h.match(/<link rel="canonical" href="([^"]+)"/)[1], 'https://bonafidenitro.com/book-appointment/');
  assert.ok(/<meta name="robots" content="noindex"/.test(h));
  assert.equal([...h.matchAll(/<h1[ >]/g)].length, 1);
  assert.equal(h.match(/<h1>([^<]*)<\/h1>/)[1], 'Book an Appointment');
  assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(h), 'only JSON-LD script allowed');
  assert.ok(!/<iframe|http-equiv="refresh"/i.test(h));
  assert.ok(!/bookingpress|bpa_page|<\?php|quickdelivr|coredelivr|mpackage/i.test(h));
  const types = JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'].map((n) => n['@type']);
  for (const ty of ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']) assert.ok(types.includes(ty), ty);
});

t('/book-appointment/ without PUBLIC_CALENDLY_URL: disabled, no calendly link, no invented destination', () => {
  const h = html();
  const main = h.match(/<main[^>]*>([\s\S]*)<\/main>/)[1];
  assert.ok(!/calendly/i.test(h), 'no Calendly reference when unconfigured');
  assert.ok(/aria-disabled="true"/.test(main) && /role="status"/.test(main));
  assert.ok(!/class="cta"[^>]*href|href="https?:\/\//.test(main), 'no external anchor when unconfigured');
});

test('booking page source: no committed Calendly URL, secret or third-party script', () => {
  const src = fs.readFileSync('src/pages/book-appointment/index.astro', 'utf8') + fs.readFileSync('src/lib/calendly.mjs', 'utf8');
  const code = src.replace(/\/\/[^\n]*|<!--[\s\S]*?-->/g, '');
  assert.ok(!/https?:\/\/[a-z0-9.-]*calendly\.com\/[^\s"')]+/i.test(code.replace(/'calendly\.com'/g, '')));
  assert.ok(!/<script|widget\.js|assets\.calendly|api[_-]?key|secret|token|oauth/i.test(code));
});

test('baseline: /book-appointment/ is a planned 200, self-canonical, noindex, not in the sitemap', () => {
  const base = JSON.parse(fs.readFileSync('src/data/seo-baseline.json', 'utf8'));
  const e = base.plannedPages.find((p) => p.path === '/book-appointment/');
  assert.deepEqual([e.expect, e.canonical, e.indexable, e.inSitemap], ['200', 'self', false, false]);
  assert.ok(!base.urls.some((u) => u.path === '/book-appointment/'));
});

t('/book-appointment/ is not in any built sitemap', () => {
  for (const f of fs.readdirSync('dist').filter((n) => /^sitemap.*\.xml$/.test(n))) {
    assert.ok(!fs.readFileSync(`dist/${f}`, 'utf8').includes('/book-appointment/'), f);
  }
});

test('redirects: five booking sources remain defined one-hop 301s to /book-appointment/', () => {
  const rules = loadRedirects();
  for (const from of BOOKING_SOURCES) {
    const r = rules.filter((x) => x.from === from);
    assert.equal(r.length, 1, from);
    assert.deepEqual([r[0].type, r[0].to, r[0].status, r[0].state], ['exact', '/book-appointment/', 301, 'defined']);
  }
});

test('redirects: three AMP booking overrides stay direct one-hop 301s to /book-appointment/', () => {
  const rules = loadRedirects();
  for (const from of AMP_SOURCES) {
    const r = rules.find((x) => x.from === from);
    assert.deepEqual([r.type, r.to, r.status, r.state], ['exact', '/book-appointment/', 301, 'defined'], from);
  }
});

test('redirects: no chain — /book-appointment/ is never a source and no destination is another source', () => {
  const rules = loadRedirects();
  const sources = new Set(rules.filter((r) => typeof r.from === 'string').map((r) => r.from));
  assert.ok(!sources.has('/book-appointment/') && !sources.has('/book-appointment'));
  for (const from of [...BOOKING_SOURCES, ...AMP_SOURCES]) {
    const r = rules.find((x) => x.from === from);
    assert.ok(!sources.has(r.to), `${from} -> ${r.to} chains`);
  }
});
