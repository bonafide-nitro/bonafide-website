// Block 58 (Issue #133), contact portion reworked for Issue #172: offline release-safety contract for the contact and booking routes.
// Builds the site into a temp dir under controlled PUBLIC_* values (synthetic fixtures only, no real
// provider URLs, no network) and asserts on the BUILT HTML. This proves build correctness only; real
// submission delivery and real calendar booking need an approved provider and a controlled test
// (docs/migration/50-block58-contact-booking-release-safety.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CONTACT = '/contact-bona-fide-nitro-coffee-and-tea/index.html';
const BOOK = '/book-appointment/index.html';
const SYNTH_FORM = '/contact-submit.php';
const LIVE = { PUBLIC_CONTACT_FORM_MODE: 'live' };
const SYNTH_CAL = 'https://calendly.com/example-team/synthetic-intro';

const REPO = process.cwd();
// Each build runs in its own temp project root (copied sources) so Astro's .astro/ cache and dist/
// never collide with other test files building in parallel, and the repo's dist/ is untouched.
const build = (env) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-block58-'));
  // Real copies: Astro resolves symlinks to real paths and then fails to find its compile metadata.
  for (const n of ['src', 'public', 'astro.config.mjs', 'package.json', 'tsconfig.json']) {
    fs.cpSync(path.join(REPO, n), path.join(root, n), { recursive: true });
  }
  fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(root, 'node_modules'));
  const clean = { ...process.env };
  delete clean.PUBLIC_CONTACT_FORM_ENDPOINT;
  delete clean.PUBLIC_CONTACT_FORM_MODE;
  delete clean.VERCEL;
  delete clean.PUBLIC_CALENDLY_URL;
  delete clean.PUBLIC_GTM_ID;
  try {
    const r = spawnSync(process.execPath, [path.join(REPO, 'node_modules/astro/astro.js'), 'build'], { cwd: root, env: { ...clean, ...env }, encoding: 'utf8' });
    assert.equal(r.status, 0, `build failed: ${r.stderr || r.stdout}`);
    const out = path.join(root, 'dist');
    const read = (p) => fs.readFileSync(out + p, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const sitemaps = fs.readdirSync(out).filter((n) => /^sitemap.*\.xml$/.test(n)).map((n) => fs.readFileSync(`${out}/${n}`, 'utf8'));
    return { contact: read(CONTACT), book: read(BOOK), sitemaps };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};
const formOpen = (h) => h.match(/<form\b[^>]*>/)[0];
const mainOf = (h) => h.match(/<main[^>]*>([\s\S]*)<\/main>/)[1];
const externalHrefs = (h) => [...mainOf(h).matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);

const assertContactDisabled = (h, label) => {
  assert.ok(!/\saction=/.test(formOpen(h)), `${label}: no action attribute`);
  assert.ok(/<fieldset[^>]*\bdisabled\b/.test(h), `${label}: fieldset disabled`);
  assert.ok(/role="status"/.test(h), `${label}: status notice`);
  assert.ok(/data-state="disabled"/.test(formOpen(h)) && !/data-endpoint=/.test(formOpen(h)), `${label}: disabled state, no endpoint`);
  assert.ok(!/forms\.example\.test|formaction=|contact-submit/i.test(h), `${label}: no destination leaks`);
  // usable fallback
  assert.ok(/href="mailto:contact@bonafidenitro\.com"/.test(h), `${label}: mailto fallback`);
  assert.ok(/href="tel:\+18554821446"/.test(h), `${label}: tel fallback`);
};
const assertBookingDisabled = (h, label) => {
  const main = mainOf(h);
  assert.ok(!/calendly/i.test(h), `${label}: no Calendly reference`);
  assert.ok(/aria-disabled="true"/.test(main) && /role="status"/.test(main), `${label}: disabled + status`);
  assert.deepEqual(externalHrefs(h), [], `${label}: no external link`);
  assert.ok(main.includes('href="/contact-bona-fide-nitro-coffee-and-tea/"'), `${label}: contact fallback link`);
};
const assertBookingRoute = (r, label) => {
  assert.ok(/<meta name="robots" content="noindex"/.test(r.book), `${label}: noindex`);
  assert.equal(r.book.match(/<link rel="canonical" href="([^"]+)"/)[1], 'https://bonafidenitro.com/book-appointment/');
  for (const s of r.sitemaps) assert.ok(!s.includes('/book-appointment/'), `${label}: not in sitemap`);
  assert.ok(!/<script(?![^>]*application\/ld\+json)|<iframe/i.test(r.book), `${label}: no script/iframe`);
};
const assertContactRoute = (r, label) => {
  assert.ok(!r.contact.includes('noindex'), `${label}: contact stays indexable`);
  assert.equal(r.contact.match(/<link rel="canonical" href="([^"]+)"/)[1], 'https://bonafidenitro.com/contact-bona-fide-nitro-coffee-and-tea/');
  const scripts = [...r.contact.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]).filter((a) => !/application\/ld\+json/.test(a));
  assert.ok(scripts.every((a) => !/\bsrc=/.test(a)), `${label}: only inline scripts (no third-party/remote script)`);
};

test('built with NO settings: contact disabled, booking disabled, fallbacks usable', () => {
  const r = build({});
  assertContactDisabled(r.contact, 'unset');
  assertBookingDisabled(r.book, 'unset');
  assertContactRoute(r, 'unset');
  assertBookingRoute(r, 'unset');
});

test('built with INVALID settings: still no destination, no link, no submit target', () => {
  const bad = [
    ['https://forms.example.test/f/x', 'https://calendly.com.evil.test/intro'],
    ['http://forms.example.test/f/x', 'http://calendly.com/example-team/intro'],
    ['javascript:alert(1)', 'https://user:pw@calendly.com/example-team/intro'],
    ['//forms.example.test/f/x', 'https://calendly.com/'],
    ['/a/../b.php', 'https://evilcalendly.com/example-team/intro'],
    ['relative.php', 'https://calendly.com/example-team/intro?x'],
    ['   ', 'https://calendly.com/'],
  ];
  for (const [form, cal] of bad) {
    const r = build({ ...LIVE, PUBLIC_CONTACT_FORM_ENDPOINT: form, PUBLIC_CALENDLY_URL: cal });
    const label = `invalid(${form} | ${cal})`;
    assert.ok(!r.contact.includes('pw@') && !r.book.includes('pw@'), `${label}: credentials never emitted`);
    assert.ok(!/\saction=/.test(formOpen(r.contact)), `${label}: no form action`);
    assert.ok(/<fieldset[^>]*\bdisabled\b/.test(r.contact), `${label}: fieldset disabled`);
    assert.ok(!/forms\.example\.test|javascript:|relative\.php|\.\.\/b/.test(r.contact), `${label}: no destination leaks`);
    assertContactDisabled(r.contact, label);
    assertBookingRoute(r, label);
  }
});

test('live without an endpoint, or an endpoint without live mode, stays disabled', () => {
  assertContactDisabled(build({ ...LIVE }).contact, 'live-no-endpoint');
  assertContactDisabled(build({ PUBLIC_CONTACT_FORM_ENDPOINT: SYNTH_FORM }).contact, 'endpoint-no-mode');
});

test('built LIVE with a same-origin path: JS-only same-origin POST target, enabled form', () => {
  const r = build({ ...LIVE, PUBLIC_CONTACT_FORM_ENDPOINT: SYNTH_FORM, PUBLIC_CALENDLY_URL: SYNTH_CAL });
  const open = formOpen(r.contact);
  assert.ok(/data-state="live"/.test(open) && open.includes(`data-endpoint="${SYNTH_FORM}"`));
  assert.ok(!/\saction=/.test(open) && !/formaction=/.test(r.contact), 'no native action: nothing posts without the script');
  assert.ok(/<fieldset[^>]*\bdisabled\b/.test(r.contact) && r.contact.includes("getElementById('contact-fields').disabled = false"), 'controls start disabled and the installed script enables them');
  assert.equal([...r.contact.matchAll(/<form\b/g)].length, 1);
  assert.ok(!/The online form is not available/.test(r.contact) && !/<strong>Demo mode/.test(r.contact));
  assert.ok(/href="mailto:contact@bonafidenitro\.com"/.test(r.contact) && /href="tel:\+18554821446"/.test(r.contact));
  assert.ok(r.contact.split(SYNTH_FORM).length === 2, 'endpoint appears exactly once');
  // every network call in the page script targets only the configured same-origin endpoint
  const js = r.contact.match(/<script>([\s\S]*?)<\/script>|<script[^>]*is:inline[^>]*>([\s\S]*?)<\/script>/);
  const script = [...r.contact.matchAll(/<script\b(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  assert.ok(js || script);
  assert.deepEqual([...script.matchAll(/fetch\(([^,)]+)/g)].map((m) => m[1]), ['endpoint']);
  assert.ok(!/https?:\/\/|XMLHttpRequest|sendBeacon|api-key|brevo/i.test(script), 'no absolute URL, no key, no Brevo in browser code');
  // booking: exactly one Calendly link, plain external link, no embed
  const links = externalHrefs(r.book).filter((u) => /calendly/i.test(u));
  assert.deepEqual(links, [SYNTH_CAL]);
  assertContactRoute(r, 'live');
  assertBookingRoute(r, 'live');
});

test('a Vercel build can never be live: VERCEL=1 forces disabled even with live + endpoint', () => {
  const r = build({ ...LIVE, PUBLIC_CONTACT_FORM_ENDPOINT: SYNTH_FORM, VERCEL: '1' });
  assertContactDisabled(r.contact, 'vercel-live');
  assert.ok(!r.contact.includes(SYNTH_FORM), 'live handler path not present in the review build');
});

test('MOCK mode (also on Vercel): demo notice, no endpoint, no fetch, nothing can be sent', () => {
  for (const env of [{ PUBLIC_CONTACT_FORM_MODE: 'mock' }, { PUBLIC_CONTACT_FORM_MODE: 'mock', VERCEL: '1', PUBLIC_CONTACT_FORM_ENDPOINT: SYNTH_FORM }]) {
    const r = build(env);
    const open = formOpen(r.contact);
    assert.ok(/data-state="mock"/.test(open) && !/data-endpoint=|\saction=/.test(open));
    assert.ok(/<strong>Demo mode/.test(r.contact) && /<fieldset[^>]*\bdisabled\b/.test(r.contact) && r.contact.includes("getElementById('contact-fields').disabled = false"));
    assert.ok(!r.contact.includes(SYNTH_FORM), 'handler path never emitted in mock mode');
    assertContactRoute(r, 'mock');
  }
});

test('configuring one route never enables the other', () => {
  const a = build({ ...LIVE, PUBLIC_CONTACT_FORM_ENDPOINT: SYNTH_FORM });
  assert.ok(/data-state="live"/.test(formOpen(a.contact)));
  assertBookingDisabled(a.book, 'contact-only');
  const b = build({ PUBLIC_CALENDLY_URL: SYNTH_CAL });
  assertContactDisabled(b.contact, 'booking-only');
  assert.ok(b.book.includes(SYNTH_CAL));
});
