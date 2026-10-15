// Block 58 (Issue #133): offline release-safety contract for the contact and booking routes.
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
const SYNTH_FORM = 'https://forms.example.test/f/synthetic-fixture';
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
  assert.ok(!/forms\.example\.test|formaction=/i.test(h), `${label}: no destination leaks`);
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
  assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(r.contact), `${label}: no scripts`);
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
    ['http://forms.example.test/f/x', 'https://calendly.com.evil.test/intro'],
    ['javascript:alert(1)', 'http://calendly.com/example-team/intro'],
    ['https://user:pw@forms.example.test/f/x', 'https://user:pw@calendly.com/example-team/intro'],
    ['   ', 'https://calendly.com/'],
    ['/relative/path', 'https://evilcalendly.com/example-team/intro'],
  ];
  for (const [form, cal] of bad) {
    const r = build({ PUBLIC_CONTACT_FORM_ENDPOINT: form, PUBLIC_CALENDLY_URL: cal });
    const label = `invalid(${form} | ${cal})`;
    assert.ok(!r.contact.includes('pw@') && !r.book.includes('pw@'), `${label}: credentials never emitted`);
    assert.ok(!/\saction=/.test(formOpen(r.contact)), `${label}: no form action`);
    assert.ok(/<fieldset[^>]*\bdisabled\b/.test(r.contact), `${label}: fieldset disabled`);
    assert.ok(!/forms\.example\.test|javascript:|relative\/path/.test(r.contact), `${label}: no destination leaks`);
    assertBookingDisabled(r.book, label);
    assertBookingRoute(r, label);
  }
});

test('built with SYNTHETIC valid settings: exactly the expected action and link, nothing else', () => {
  const r = build({ PUBLIC_CONTACT_FORM_ENDPOINT: SYNTH_FORM, PUBLIC_CALENDLY_URL: SYNTH_CAL });
  const open = formOpen(r.contact);
  assert.ok(/method="post"/i.test(open) && !/method="get"/i.test(open));
  assert.deepEqual([...open.matchAll(/\saction="([^"]*)"/g)].map((m) => m[1]), [SYNTH_FORM]);
  assert.ok(!/<fieldset[^>]*\bdisabled\b/.test(r.contact), 'form enabled when configured');
  assert.ok(!/formaction=/.test(r.contact), 'no per-control action override');
  assert.equal([...r.contact.matchAll(/<form\b/g)].length, 1);
  assert.ok(!/role="status"[^>]*>The online form is not available/.test(r.contact), 'unavailable notice absent');
  // fallbacks stay present alongside a configured form
  assert.ok(/href="mailto:contact@bonafidenitro\.com"/.test(r.contact) && /href="tel:\+18554821446"/.test(r.contact));
  assert.ok(r.contact.split(SYNTH_FORM).length === 2, 'endpoint appears exactly once (the action)');
  // booking: exactly one Calendly link, plain external link, no embed
  const links = externalHrefs(r.book).filter((u) => /calendly/i.test(u));
  assert.deepEqual(links, [SYNTH_CAL]);
  assert.ok(/<a class="cta" href="[^"]+" rel="noopener noreferrer"/.test(r.book));
  assert.ok(!/aria-disabled="true"/.test(mainOf(r.book)) && !/not available/i.test(mainOf(r.book)));
  assertContactRoute(r, 'configured');
  assertBookingRoute(r, 'configured');
});

test('configuring one route never enables the other', () => {
  const a = build({ PUBLIC_CONTACT_FORM_ENDPOINT: SYNTH_FORM });
  assert.ok(/\saction=/.test(formOpen(a.contact)));
  assertBookingDisabled(a.book, 'contact-only');
  const b = build({ PUBLIC_CALENDLY_URL: SYNTH_CAL });
  assertContactDisabled(b.contact, 'booking-only');
  assert.ok(b.book.includes(SYNTH_CAL));
});
