// Block 20 (Issue #58): Apache redirect artifact generated from src/data/redirects.yaml.
// The artifact text is re-parsed here with an independent mini-interpreter (not the generator's own rule objects).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadRedirects, loadBaseline } from '../../src/lib/data.mjs';
import { renderHtaccess, buildRules, ARTIFACT_PATH } from '../../scripts/build-htaccess.mjs';

const ORIGIN = 'https://bonafidenitro.com';
const text = fs.readFileSync(ARTIFACT_PATH, 'utf8');
const all = loadRedirects();
const defined = all.filter((r) => r.state === 'defined');
const pending = all.filter((r) => r.state !== 'defined');
const byState = (st) => all.filter((r) => r.state === st);

const parse = (src) => {
  const rules = []; let id = null; let conds = [];
  for (const line of src.split('\n')) {
    if (/^# [a-z0-9-]+$/.test(line) && !line.startsWith('# Rules')) id = line.slice(2);
    else if (line.startsWith('RewriteCond ')) conds.push(line.slice(12));
    else if (line.startsWith('RewriteRule ')) {
      const m = line.match(/^RewriteRule (\S+) (\S+) \[([^\]]+)\]$/);
      assert.ok(m, `unparseable: ${line}`);
      rules.push({ id, conds, pattern: m[1], target: m[2], flags: m[3].split(',') });
      conds = [];
    }
  }
  return rules;
};
const rules = parse(text);

// Evaluate one request against the artifact: first matching rule wins ([L]); returns {status, location} or null.
const request = (url) => {
  const u = new URL(url);
  const https = u.protocol === 'https:';
  for (const r of rules) {
    const m = u.pathname.slice(1).match(new RegExp(r.pattern));
    if (!m) continue;
    const ok = r.conds.every((c) => {
      const [, name, rest] = c.match(/^%\{(\w+)\} (.*)$/);
      const val = { HTTPS: https ? 'on' : 'off', HTTP_HOST: u.host, QUERY_STRING: u.search.slice(1) }[name];
      if (rest === '=on') return val === 'on';
      if (rest === '!=on') return val !== 'on';
      const re = rest.replace(/ \[NC\]$/, ''); return new RegExp(re, rest.endsWith('[NC]') ? 'i' : '').test(val);
    });
    if (!ok) continue;
    let loc = r.target.replace('%{REQUEST_URI}', u.pathname).replace(/\$(\d)/g, (_, n) => m[n]);
    if (loc.endsWith('?')) loc = loc.slice(0, -1);
    else if (!r.flags.includes('QSD') && u.search && !loc.includes('?')) loc += u.search;
    return { status: Number(r.flags.find((f) => f.startsWith('R=')).slice(2)), location: loc, rule: r };
  }
  return null;
};

test('artifact is byte-identical to a fresh generation and deterministic', () => {
  assert.equal(text, renderHtaccess());
  assert.equal(renderHtaccess(), renderHtaccess(buildRules()));
  assert.equal(text.includes('\r'), false);
  assert.ok(text.endsWith('\n'));
});

test('rule count equals the number of defined register rules (35)', () => {
  assert.equal(defined.length, 35);
  assert.equal(rules.length, defined.length);
  assert.match(text, /^# Rules: 35$/m);
});

test('no pending-decision, deliberate-404 or dropped rule is emitted (Block 21 accounting)', () => {
  assert.equal(all.length, 58);
  assert.equal(byState('pending-decision').length, 8);
  assert.equal(byState('deliberate-404').length, 12);
  assert.equal(byState('dropped').length, 3);
  assert.equal(pending.length, 23);
  assert.deepEqual(byState('pending-decision').map((r) => r.id).sort(), ['svc-cascara', 'svc-espresso', 'svc-ethiopia', 'svc-green-citrus', 'svc-guatemala', 'svc-hibiscus', 'svc-passion-fruit', 'svc-peru']);
  assert.deepEqual(byState('dropped').map((r) => r.from).sort(), ['/?p=1187', '/?p=1202', '/?p=1211']);
  assert.ok(pending.every((r) => r.to === null));
  assert.ok(byState('deliberate-404').every((r) => r.type === 'exact' && r.from.startsWith('/')));
  const ids = new Set(rules.map((r) => r.id));
  for (const p of pending) {
    assert.equal(ids.has(p.id), false, `pending id ${p.id} emitted`);
    if (p.from.startsWith('/') && !p.from.includes('?')) {
      const base = p.from.replace(/\/$/, '');
      assert.equal(request(ORIGIN + p.from), null, `pending source ${p.from} matches an emitted rule`);
      assert.equal(rules.some((r) => r.pattern === `^${base.slice(1)}/?$` || r.pattern === `^${p.from.slice(1)}$`), false, `pending source ${p.from} emitted`);
    } else assert.equal(request(ORIGIN + p.from), null, `pending source ${p.from} matches an emitted rule`);
  }
});

test('every defined rule is present exactly once and is 301 only', () => {
  assert.deepEqual([...rules.map((r) => r.id)].sort(), defined.map((r) => r.id).sort());
  assert.equal(new Set(rules.map((r) => r.id)).size, rules.length);
  for (const r of rules) {
    assert.ok(r.flags.includes('R=301'), `${r.id} not 301`);
    assert.equal(r.flags.filter((f) => f.startsWith('R=')).length, 1);
    assert.ok(r.flags.includes('L'));
  }
  assert.doesNotMatch(text, /R=30[2378]|R(?=[,\]])|\[P|\[F|\[G/);
});

const sampleSource = (r) => {
  if (r.id === 'amp-pattern') return '/anything/amp/';
  if (r.id === 'amp-bookingpress-params') return '/amp/?bpa_page=bookingpress_download&x=1';
  if (r.type === 'canonicalisation') return r.from.replace('/*', '/some-page/');
  return r.from;
};
const expectedDest = (r, src) => {
  if (r.id === 'amp-pattern') return `${ORIGIN}/anything/`;
  if (r.type === 'canonicalisation') return `${ORIGIN}/some-page/`;
  return r.to.startsWith('/') ? ORIGIN + r.to : r.to;
};

test('every generated source/destination/status matches the register', () => {
  for (const r of defined) {
    const src = sampleSource(r);
    const url = src.startsWith('/') ? ORIGIN + src : src;
    const hit = request(url);
    assert.ok(hit, `${r.id}: ${url} did not match`);
    assert.equal(hit.status, r.status);
    assert.equal(hit.rule.id, r.id, `${r.id}: wrong rule won for ${url} (${hit.rule.id})`);
    assert.equal(decodeURI(hit.location), expectedDest(r, src), `${r.id} destination`);
  }
});

test('external destinations are percent-encoded ASCII and drop the source query', () => {
  const hair = rules.find((r) => r.id === 'svc-hair-raiser');
  assert.match(hair.target, /^https:\/\/www\.nitrocoffee\.store\/products\/hair-raiser%C2%AE-organic-nitro-coffee$/);
  assert.ok(hair.flags.includes('NE') && hair.flags.includes('QSD'));
  for (const r of rules) assert.match(r.target, /^[\x21-\x7e]+$/, `${r.id} target not ASCII`);
});

test('one hop: every destination is itself unredirected (no chains, no loops), from any protocol/host form', () => {
  for (const r of defined) {
    for (const base of [ORIGIN, 'http://bonafidenitro.com', 'http://www.bonafidenitro.com', 'https://www.bonafidenitro.com']) {
      if (!r.from.startsWith('/') || r.from.includes('?') || r.from.includes('<')) continue;
      const first = request(base + r.from);
      assert.ok(first && first.status === 301, `${base}${r.from}`);
      if (first.location.startsWith(ORIGIN + '/') || first.location === ORIGIN) assert.equal(request(first.location), null, `${r.id}: ${first.location} redirects again`);
      assert.notEqual(first.location, base + r.from, `${r.id} loops`);
    }
  }
  // generic AMP rule and the three booking overrides stay one hop
  for (const slug of ['about', 'thank-you', 'my-bookings', 'appointment-cancellation-confirmation', 'products']) {
    const first = request(`${ORIGIN}/${slug}/amp/`);
    assert.ok(first);
    assert.equal(request(first.location), null, `${slug}/amp/ chains to ${first.location}`);
  }
  assert.equal(request(`${ORIGIN}/thank-you/amp/`).location, ORIGIN + '/book-appointment/');
  assert.equal(request(`${ORIGIN}/amp/?bpa_page=bookingpress_download&a=b`).location, ORIGIN + '/');
  // canonicalisation is a single hop to a final URL
  for (const u of ['http://bonafidenitro.com/', 'http://www.bonafidenitro.com/about/', 'https://www.bonafidenitro.com/blog/?x=1']) {
    const first = request(u);
    assert.equal(first.status, 301);
    assert.equal(new URL(first.location).origin, ORIGIN);
    assert.equal(request(first.location), null);
  }
});

test('protected URLs are never redirect sources: canonical https URLs fall through (200)', () => {
  const protectedPaths = loadBaseline().urls.map((u) => u.path);
  for (const p of protectedPaths) assert.equal(request(ORIGIN + p), null, `${p} is redirected`);
  for (const p of ['/products/', '/products-2/']) assert.equal(request(ORIGIN + p), null);
  assert.equal(rules.some((r) => /products-2/.test(r.pattern + r.target)), false);
  for (const r of defined) assert.equal(protectedPaths.includes(r.from), false);
});

test('generator refuses a pending, non-301 or protected-source input', () => {
  const base = { id: 'x', type: 'exact', from: '/x/', to: '/about/', status: 301, state: 'defined' };
  assert.equal(buildRules([{ ...base, state: 'pending-decision', to: null }]).length, 0);
  assert.equal(buildRules([{ ...base, state: 'deliberate-404', to: null }]).length, 0);
  assert.equal(buildRules([{ ...base, state: 'dropped', to: null }]).length, 0);
  assert.throws(() => buildRules([{ ...base, status: 302 }]), /301/);
  assert.throws(() => buildRules([{ ...base, from: '/products/' }]), /protected/);
  assert.throws(() => buildRules([base, { ...base, id: 'y' }]), /duplicate/);
});

test('Block 21: the three approved additions are emitted; deliberate-404 sources have no rule or redirect', () => {
  const dest = (from) => rules.find((r) => r.pattern === `^${from.slice(1)}$`)?.target;
  assert.equal(dest('/coffee-trend-dominate-2018'), ORIGIN + '/coffee-trends-dominate-2018/');
  assert.equal(dest('/cold-brew-coffee-tap-future-serve/'), ORIGIN + '/coffee-on-tap-is-the-future/');
  assert.equal(dest('/services/mango-tea/'), 'https://www.nitrocoffee.store/products/mango-nitro-tea');
  for (const r of all.filter((x) => x.state === 'deliberate-404')) {
    assert.equal(rules.some((x) => x.pattern === `^${r.from.slice(1)}$`), false, r.from);
    assert.equal(request(ORIGIN + r.from), null, r.from);
  }
  // no emitted rule sends anything to the bare homepage except the pre-existing evidenced /amp/ rules
  for (const r of rules.filter((x) => x.target === ORIGIN + '/')) assert.match(r.id, /^amp-/);
});
