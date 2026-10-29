// Issue #172: offline tests for the PHP contact handler. The harness injects a MOCK Brevo transport, so no
// request leaves the machine, no real key/sender/recipient is used (all values below are synthetic
// .example.test fixtures) and a test can never cause a production send.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const hasPhp = spawnSync('php', ['-v']).status === 0;
const t = (name, fn) => test(name, { skip: !hasPhp && 'php not installed' }, fn);

const CONFIG = {
  mode: 'test', brevo_api_key: 'synthetic-key-not-real', sender_email: 'sender@sender.example.test', sender_name: 'Synthetic Sender',
  recipient_email: 'prod@prod.example.test', test_recipient_email: 'test@test.example.test',
  allowed_origins: ['https://site.example.test'], ip_salt: 'synthetic-salt',
};
const ORIGIN = { HTTP_ORIGIN: 'https://site.example.test' };
const good = (o = {}) => ({ name: 'Ada Lovelace', email: 'ada@example.test', category: 'retailer', message: 'Hello, I would like to stock your nitro coffee.', bf_hp: '', elapsed_ms: 9000, ...o });
const run = (requests, { config = {}, transport, pre_files } = {}) => {
  const r = spawnSync('php', ['tests/contact/harness.php'], { input: JSON.stringify({ config: { ...CONFIG, ...config }, requests: requests.map((q) => ({ server: ORIGIN, ...q })), transport, pre_files }), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};
const one = (json, opts, extra = {}) => { const o = run([{ json, ...extra }], opts); return { ...o.results[0], calls: o.calls, logs: o.logs }; };

t('happy path: one Brevo call, plain text only, TEST recipient in test mode, reply-to visitor', () => {
  const r = one(good());
  assert.equal(r.status, 200); assert.deepEqual(r.body, { ok: true });
  assert.equal(r.calls.length, 1);
  const c = r.calls[0];
  assert.equal(c.url, 'https://api.brevo.com/v3/smtp/email');
  assert.deepEqual(c.payload.to, [{ email: 'test@test.example.test' }]);
  assert.equal(c.payload.replyTo.email, 'ada@example.test');
  assert.ok(c.payload.subject.startsWith('[TEST] Website inquiry (retailer) from Ada Lovelace'));
  assert.ok(c.payload.textContent.includes('Hello, I would like to stock'));
  assert.equal(c.payload.htmlContent, undefined);
  assert.ok(c.headers.includes('api-key: synthetic-key-not-real'));
  assert.ok(!JSON.stringify(r.body).includes('synthetic-key'));
});

t('production mode sends to the production recipient without a TEST prefix', () => {
  const r = one(good(), { config: { mode: 'production' } });
  assert.deepEqual(r.calls[0].payload.to, [{ email: 'prod@prod.example.test' }]);
  assert.ok(!r.calls[0].payload.subject.startsWith('[TEST]'));
});

t('contact inquiries never touch Brevo marketing lists/contacts endpoints', () => {
  const r = one(good());
  assert.ok(r.calls.every((c) => c.url.endsWith('/v3/smtp/email')));
  assert.ok(!/listIds|updateEnabled|\/contacts/i.test(JSON.stringify(r.calls)));
});

t('missing or placeholder configuration is disabled (503), nothing is sent', () => {
  for (const config of [{ brevo_api_key: '' }, { brevo_api_key: 'SET_ON_SERVER_ONLY' }, { sender_email: 'SET_VERIFIED_BREVO_SENDER' }, { mode: 'live' }, { test_recipient_email: '' }, { storage_dir: '/nonexistent/dir' }]) {
    const r = one(good(), { config });
    assert.equal(r.status, 503, JSON.stringify(config)); assert.equal(r.body.error, 'not_configured'); assert.equal(r.calls.length, 0);
  }
});

t('validation: missing/invalid fields give 422 with per-field messages and no send', () => {
  const r = one(good({ name: '  ', email: 'not-an-email', message: 'short' }));
  assert.equal(r.status, 422); assert.deepEqual(Object.keys(r.body.fields).sort(), ['email', 'message', 'name']); assert.equal(r.calls.length, 0);
  for (const email of ['a@b', 'a b@example.test', 'a@example.test,b@example.test', 'x@example.test\r\nBcc: v@example.test', '<a@example.test>', 'a'.repeat(250) + '@example.test']) {
    assert.equal(one(good({ email })).status, 422, email);
  }
});

t('bounded inputs and malformed requests', () => {
  const long = one(good({ name: 'N'.repeat(500), message: 'M'.repeat(9000) }));
  assert.equal(long.status, 200);
  assert.ok(long.calls[0].payload.subject.length < 130);
  assert.ok(long.calls[0].payload.textContent.length < 4300);
  assert.equal(one(good({ category: 'hacker' })).calls[0].payload.subject.includes('hacker'), false);
  const big = run([{ body: JSON.stringify(good({ message: 'x'.repeat(20000) })) }]);
  assert.equal(big.results[0].status, 413);
  assert.equal(run([{ body: '{not json' }]).results[0].status, 400);
  assert.equal(run([{ body: '[1,2]' }]).results[0].status, 400);
  assert.equal(one(good({ name: ['x'] })).status, 400);
  assert.equal(run([{ json: good(), content_type: 'application/x-www-form-urlencoded' }]).results[0].status, 415);
  const get = run([{ method: 'GET', json: good() }]).results[0];
  assert.equal(get.status, 405); assert.equal(get.headers.Allow, 'POST');
});

t('origin check: wrong, missing or look-alike origins are refused', () => {
  for (const server of [{ HTTP_ORIGIN: 'https://evil.example.test' }, {}, { HTTP_ORIGIN: 'https://site.example.test.evil.test' }, { HTTP_ORIGIN: 'http://site.example.test' }, { HTTP_ORIGIN: 'null' }]) {
    const o = run([{ json: good(), server }]);
    assert.equal(o.results[0].status, 403, JSON.stringify(server)); assert.equal(o.calls.length, 0);
  }
});

t('spam: honeypot, too-fast and link-stuffed posts look successful but send nothing', () => {
  for (const body of [good({ bf_hp: 'http://spam.example.test' }), good({ elapsed_ms: 200 }), (({ elapsed_ms, ...rest }) => rest)(good()), good({ message: 'visit http://a.example.test http://b.example.test http://c.example.test now' })]) {
    const r = one(body);
    assert.equal(r.status, 200); assert.deepEqual(r.body, { ok: true }); assert.equal(r.calls.length, 0);
  }
});

t('rate limiting per client IP (and a global cap), with Retry-After', () => {
  const o = run(Array.from({ length: 7 }, () => ({ json: good() })), { config: { rate_per_ip_hour: 5 } });
  assert.deepEqual(o.results.map((r) => r.status), [200, 200, 200, 200, 200, 429, 429]);
  assert.ok(Number(o.results[5].headers['Retry-After']) > 0); assert.equal(o.calls.length, 5);
  const other = run([...Array.from({ length: 5 }, () => ({ json: good() })), { json: good(), ip: '198.51.100.9' }], { config: { rate_per_ip_hour: 5 } });
  assert.equal(other.results[5].status, 200, 'a different client is not blocked');
  const g = run([{ json: good(), ip: '1.1.1.1' }, { json: good(), ip: '2.2.2.2' }, { json: good(), ip: '3.3.3.3' }], { config: { rate_global_hour: 2 } });
  assert.deepEqual(g.results.map((r) => r.status), [200, 200, 429]);
  const later = run([{ json: good(), now: 1000000 }, { json: good(), now: 1000000 + 3601 }], { config: { rate_per_ip_hour: 1 } });
  assert.deepEqual(later.results.map((r) => r.status), [200, 200], 'window expires');
});

t('rate-limit files of inactive clients expire; tracked clients are capped', () => {
  const o = run([{ json: good() }], { config: {}, pre_files: { 'rl-ip-stale.json': 1000000 - 3601, 'rl-ip-fresh.json': 1000000 - 60 } });
  assert.ok(!o.left.includes('rl-ip-stale.json'), 'stale client file removed');
  assert.ok(o.left.includes('rl-ip-fresh.json'), 'recent client file kept');
  const capped = run([{ json: good() }], { config: { rate_max_clients: 1 }, pre_files: { 'rl-ip-a.json': 1000000 - 60 } });
  assert.equal(capped.results[0].status, 429, 'new client refused at the cap');
  assert.ok(!capped.left.some((f) => f !== 'rl-ip-a.json'), 'no new file created beyond the cap');
});

t('Brevo errors: safe responses, no provider detail, nothing sensitive logged', () => {
  const cases = [[{ status: 429, error: null }, 503, 'rate_limited'], [{ status: 500, error: null }, 503, 'delivery_failed'], [{ status: 401, error: null }, 502, 'delivery_failed'], [{ status: 0, error: 'curl' }, 503, 'delivery_failed']];
  for (const [transport, status, error] of cases) {
    const r = one(good(), { transport });
    assert.equal(r.status, status, JSON.stringify(transport)); assert.equal(r.body.error, error);
    const blob = JSON.stringify([r.body, r.logs]);
    assert.ok(!/synthetic-key|ada@example|Lovelace|Hello, I would/.test(blob), 'no key or visitor data in response/log');
    assert.equal(r.logs.length, 1);
  }
});

t('XSS/header injection: payload is JSON plain text only, control characters stripped', () => {
  const r = one(good({ name: 'Eve\r\nBcc: victim@example.test <script>alert(1)</script>', message: '<img src=x onerror=alert(1)>\r\nBcc: v@example.test\u0000 hello there' }));
  const p = r.calls[0].payload;
  assert.ok(!/[\r\n]/.test(p.subject), 'subject is one line');
  assert.equal(p.htmlContent, undefined);
  assert.equal(Object.keys(p).filter((k) => /header|bcc|cc/i.test(k)).length, 0);
  assert.ok(!p.textContent.includes('\u0000'));
  assert.deepEqual(p.to, [{ email: 'test@test.example.test' }]);
  assert.ok(!('bcc' in p) && !('cc' in p));
});

t('no real credential or live recipient is committed under deploy/contact or the harness', () => {
  for (const f of ['deploy/contact/contact-lib.php', 'deploy/contact/contact-submit.php', 'deploy/contact/contact-config.example.php']) {
    const src = fs.readFileSync(f, 'utf8');
    assert.ok(!/xkeysib-|xsmtpsib-/i.test(src), f);
  }
  const ex = fs.readFileSync('deploy/contact/contact-config.example.php', 'utf8');
  assert.ok(/SET_ON_SERVER_ONLY/.test(ex) && /SET_VERIFIED_BREVO_SENDER/.test(ex));
  assert.ok(fs.readFileSync('.gitignore', 'utf8').includes('contact-config.php'));
});
