// Block 11 (Issue #40): provider-agnostic contact form. Page checks run against dist/ built
// WITHOUT an endpoint (the committed default); run `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveContactEndpoint } from '../../src/lib/contact-form.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const PAGE = 'dist/contact-bona-fide-nitro-coffee-and-tea/index.html';

test('resolveContactEndpoint accepts only a clean https URL', () => {
  assert.equal(resolveContactEndpoint('https://forms.example.test/f/abc'), 'https://forms.example.test/f/abc');
  for (const bad of [undefined, null, '', '   ', 'http://forms.example.test/x', '/relative', 'javascript:alert(1)', 'https://u:p@forms.example.test/x', 'not a url', 42]) {
    assert.equal(resolveContactEndpoint(bad), null, String(bad));
  }
});

t('contact page: POST form, labelled name/email/message, nothing invented', () => {
  const h = fs.readFileSync(PAGE, 'utf8');
  const form = h.match(/<form\b[^>]*>[\s\S]*<\/form>/)[0];
  assert.ok(/method="post"/i.test(form));
  assert.ok(/type="email"/.test(form) && /name="email"/.test(form));
  for (const id of ['contact-name', 'contact-email', 'contact-message']) assert.ok(new RegExp(`<label for="${id}">`).test(form), id);
  assert.equal([...form.matchAll(/<(?:input|textarea|select)\b[^>]*name="([^"]+)"/g)].map((m) => m[1]).join(','), 'name,email,message,bf_hp');
  assert.ok(/<button type="submit"/.test(form));
  assert.ok(!/captcha|consent|newsletter|subscribe|opt-in|privacy|cookie/i.test(form));
});

t('contact page without an endpoint: disabled, no action, no GET, no scripts', () => {
  const h = fs.readFileSync(PAGE, 'utf8');
  const open = h.match(/<form\b[^>]*>/)[0];
  assert.ok(!/\saction=/.test(open), 'no action attribute without a configured endpoint');
  assert.ok(!/method="get"/i.test(open));
  assert.ok(/<fieldset[^>]*\bdisabled\b/.test(h));
  assert.ok(/role="status"/.test(h));
  assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(h), 'only JSON-LD script allowed');
  assert.ok(!/https?:\/\/(?!bonafidenitro\.com|www\.nitrocoffee\.store)[^"'\s<]*(formspree|basin|web3forms|getform|formsubmit)/i.test(h));
});

t('contact page keeps URL, title, H1, canonical, indexability', () => {
  const h = fs.readFileSync(PAGE, 'utf8');
  assert.equal(h.match(/<title>([^<]*)<\/title>/)[1], 'Contact - Bona Fide Nitro Coffee And Tea');
  assert.equal(h.match(/<h1>([^<]*)<\/h1>/)[1], 'Contact');
  assert.equal(h.match(/<link rel="canonical" href="([^"]+)"/)[1], 'https://bonafidenitro.com/contact-bona-fide-nitro-coffee-and-tea/');
  assert.ok(!h.includes('noindex'));
});

test('no endpoint, key or secret is committed', () => {
  const src = fs.readFileSync('src/pages/contact-bona-fide-nitro-coffee-and-tea/index.astro', 'utf8') + fs.readFileSync('src/lib/contact-form.mjs', 'utf8');
  assert.ok(!/https?:\/\/(?!www\.nitrocoffee\.store)[a-z0-9.-]+\/[^\s"')]*(f|form|submit|api)\b/i.test(src.replace(/\/\/[^\n]*|<!--[\s\S]*?-->/g, '')));
  assert.ok(!/api[_-]?key|secret|token/i.test(src.replace(/\/\/[^\n]*|<!--[\s\S]*?-->/g, '')));
});
