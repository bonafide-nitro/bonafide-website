// Block 11 (Issue #40), reworked for Issue #172: contact form build gating. Page checks run against dist/ built
// WITHOUT an endpoint (the committed default); run `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveContactEndpoint, resolveContactConfig } from '../../src/lib/contact-form.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const PAGE = 'dist/contact-bona-fide-nitro-coffee-and-tea/index.html';

test('resolveContactEndpoint accepts only a clean same-origin path', () => {
  for (const ok of ['/contact-submit.php', '/api/contact.php']) assert.equal(resolveContactEndpoint(ok), ok);
  for (const bad of [undefined, null, '', '   ', 'https://forms.example.test/f/abc', 'http://x.test/a', '//evil.test/x', '/a/../b', 'relative.php', 'javascript:alert(1)', '/a?x=1', '/a#b', '/a b', 42]) {
    assert.equal(resolveContactEndpoint(bad), null, String(bad));
  }
});

test('resolveContactConfig is fail-closed and never live on Vercel', () => {
  const ep = '/contact-submit.php';
  assert.deepEqual(resolveContactConfig({}), { state: 'disabled', endpoint: null });
  assert.equal(resolveContactConfig({ mode: 'live', endpoint: ep }).state, 'live');
  assert.equal(resolveContactConfig({ mode: 'live', endpoint: ep, vercel: '1' }).state, 'disabled');
  assert.equal(resolveContactConfig({ mode: 'live' }).state, 'disabled');
  assert.equal(resolveContactConfig({ endpoint: ep }).state, 'disabled');
  assert.deepEqual(resolveContactConfig({ mode: 'mock', endpoint: ep, vercel: '1' }), { state: 'mock', endpoint: null });
  assert.equal(resolveContactConfig({ mode: 'bogus', endpoint: ep }).state, 'disabled');
});

t('contact page: labelled fields, accessible errors, privacy copy, no marketing opt-in', () => {
  const h = fs.readFileSync(PAGE, 'utf8');
  const form = h.match(/<form\b[^>]*>[\s\S]*<\/form>/)[0];
  assert.ok(/method="post"/i.test(form));
  assert.ok(/type="email"/.test(form) && /name="email"/.test(form));
  for (const id of ['contact-name', 'contact-email', 'contact-category', 'contact-message']) assert.ok(new RegExp(`<label for="${id}">`).test(form), id);
  assert.equal([...form.matchAll(/<(?:input|textarea|select)\b[^>]*name="([^"]+)"/g)].map((m) => m[1]).join(','), 'name,email,category,message,bf_hp');
  for (const c of ['consumer', 'retailer', 'distributor', 'co-packer']) assert.ok(form.includes(`value="${c}"`), c);
  assert.ok(/<button type="submit"/.test(form));
  assert.ok(/role="alert"/.test(form) && /aria-live="polite"/.test(form) && /aria-describedby="contact-email-err"/.test(form));
  assert.ok(/do not add you to any mailing list/i.test(form));
  assert.ok(!/captcha|newsletter|subscribe|opt-in|cookie/i.test(form.replace(/do not add you to any mailing list/i, '')));
});

t('contact page without configuration: disabled, no action, no GET, no remote script', () => {
  const h = fs.readFileSync(PAGE, 'utf8');
  const open = h.match(/<form\b[^>]*>/)[0];
  assert.ok(!/\saction=/.test(open) && !/data-endpoint=/.test(open), 'no destination without configuration');
  assert.ok(!/method="get"/i.test(open));
  assert.ok(/data-state="disabled"/.test(open));
  assert.ok(/<fieldset[^>]*\bdisabled\b/.test(h));
  assert.ok(/role="status"/.test(h) && /not available yet/.test(h));
  assert.ok(!/<script[^>]*\bsrc=/.test(h));
  assert.ok(!/https?:\/\/(?!bonafidenitro\.com|www\.nitrocoffee\.store)[^"'\s<]*(formspree|basin|web3forms|getform|formsubmit|brevo)/i.test(h));
});

t('contact page keeps URL, title, H1, canonical, indexability', () => {
  const h = fs.readFileSync(PAGE, 'utf8');
  assert.equal(h.match(/<title>([^<]*)<\/title>/)[1], 'Contact - Bona Fide Nitro Coffee And Tea');
  assert.equal(h.match(/<h1>([^<]*)<\/h1>/)[1], 'Contact');
  assert.equal(h.match(/<link rel="canonical" href="([^"]+)"/)[1], 'https://bonafidenitro.com/contact-bona-fide-nitro-coffee-and-tea/');
  assert.ok(!h.includes('noindex'));
});

test('no endpoint, key or secret is committed in the page or config module', () => {
  const src = (fs.readFileSync('src/pages/contact-bona-fide-nitro-coffee-and-tea/index.astro', 'utf8') + fs.readFileSync('src/lib/contact-form.mjs', 'utf8')).replace(/\/\/[^\n]*|<!--[\s\S]*?-->/g, '');
  assert.ok(!/https?:\/\/(?!www\.nitrocoffee\.store)[a-z0-9.-]+\/[^\s"')]*(f|form|submit|api)\b/i.test(src));
  assert.ok(!/api[_-]?key|secret|token|xkeysib|brevo/i.test(src));
});
