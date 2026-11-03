// Issue #192: offline tests for the one-shot contact test-send script and its workflow. No hosting access, no network, no email.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = path.resolve('deploy/contact/contact-test-send.sh');
const LIB = path.resolve('deploy/contact/contact-lib.php');
const SRC = fs.readFileSync(SCRIPT, 'utf8');
const WF = fs.readFileSync('.github/workflows/godaddy-contact-test-send.yml', 'utf8');
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const SECRET = 'xkeysib-' + 'a1b2c3d4'.repeat(8) + '-ZZZZ9999';
const TEST_TO = 'inbox-7731@test.example.test';
const PROD_TO = 'prod-9912@prod.example.test';
const SENDER = 'sender-4410@sender.example.test';
const IP = '203.0.113.77';
const php = (o) => `<?php return ${JSON.stringify(o).replace(/^\{/, '[').replace(/\}$/, ']').replace(/"([a-z_]+)":/g, "'$1'=>")};`;
const base = { mode: 'test', brevo_api_key: SECRET, sender_email: SENDER, sender_name: 'BF', recipient_email: PROD_TO, test_recipient_email: TEST_TO, allowed_origins: ['https://bonafidenitro.com'], storage_dir: '/nonexistent', ip_salt: 'salt-xyz' };

function home(cfg) {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-send-'));
  if (cfg !== undefined) { fs.mkdirSync(path.join(h, 'bonafide-private')); fs.writeFileSync(path.join(h, 'bonafide-private', 'contact-config.php'), cfg); }
  return h;
}
function run(h, status, body, { withHome = true, lib = true } = {}) {
  const f = path.join(h, 'resp');
  fs.writeFileSync(f, `${status}\n${body}`);
  const env = { ...process.env, BF_TEST_RESPONSE: f };
  if (withHome) env.BF_HOME = h; else delete env.BF_HOME;
  if (lib) env.BF_LIB_B64 = fs.readFileSync(LIB).toString('base64'); else delete env.BF_LIB_B64;
  const r = spawnSync('bash', [SCRIPT], { env, encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
}
const marker = (h) => path.join(h, 'bonafide-private', 'contact-test-send.attempted');
const noLeak = (out) => {
  for (const s of [SECRET, 'xkeysib', TEST_TO, PROD_TO, SENDER, IP, 'salt-xyz', 'ENDPOINT TEST', 'messageId', 'mailin']) assert.ok(!out.includes(s), `leaked ${s}: ${out}`);
  assert.equal(out.trim().split('\n').length, 1, out);
};

test('workflow pins both files and is manual, main-only, protected, confirm-gated, no public_html', () => {
  assert.equal(WF.match(/PIN_SCRIPT_SHA256: ([0-9a-f]{64})/)[1], sha(SCRIPT));
  assert.equal(WF.match(/PIN_LIB_SHA256: ([0-9a-f]{64})/)[1], sha(LIB));
  assert.match(WF, /workflow_dispatch:/);
  assert.ok(!/^\s+(push|pull_request|schedule):/m.test(WF));
  assert.match(WF, /github\.ref == 'refs\/heads\/main'/);
  assert.match(WF, /environment: godaddy-contact-test-send/);
  assert.match(WF, /StrictHostKeyChecking=yes/);
  assert.match(WF, /SEND_ONE_TEST_EMAIL/);
  assert.ok(!/public_html\//.test(WF.replace(/^#.*$/gm, '')));
  assert.ok(!/BF_TEST_RESPONSE|BF_HOME/.test(WF));
  assert.ok(!/\bscp\s|sftp/.test(WF.replace(/^\s*#.*$/gm, '')));
});

test('script: test mode only, marker before send, one call, nothing written to public_html', () => {
  assert.match(SRC, /!== 'test'\) bf_refuse/);
  assert.ok(SRC.indexOf('file_put_contents($marker') < SRC.indexOf('$res = bf_handle('));
  assert.match(SRC, /\+\+\$calls > 1/);
  assert.ok(!/public_html/.test(SRC.replace(/^#.*$/gm, '')));
  assert.match(SRC, /BF_TEST_RESPONSE="\$\{BF_HOME:\+\$\{BF_TEST_RESPONSE:-\}\}"/);
  assert.ok(!/set -x|var_dump|print_r/.test(SRC));
});

test('successful send: exit 0, one fixed line, marker written, temp dir removed, no leaks', () => {
  const h = home(php(base));
  const r = run(h, 201, '{"messageId":"<abc@smtp-relay.mailin.fr>"}');
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /handler_status=200 provider_status=201 outcome=sent/);
  noLeak(r.out);
  assert.ok(fs.existsSync(marker(h)));
  assert.equal(fs.readdirSync(h).filter((n) => n.startsWith('.bf-test-send-')).length, 0);
});

test('one-shot: a second run refuses without any request', () => {
  const h = home(php(base));
  assert.equal(run(h, 201, '{}').status, 0);
  const r = run(h, 201, '{}');
  assert.equal(r.status, 2);
  assert.match(r.out, /one-shot guard/);
});

test('Brevo refusals are classified, not retried, and leak nothing', () => {
  const cases = [
    [401, JSON.stringify({ code: 'unauthorized', message: `We have detected you are using an unrecognised IP address ${IP}.` }), 'ip_not_authorized'],
    [401, JSON.stringify({ code: 'unauthorized', message: 'Key not found' }), 'key_not_recognised'],
    [400, JSON.stringify({ code: 'invalid_parameter', message: `sender ${SENDER} is not valid` }), 'sender_not_valid'],
    [403, JSON.stringify({ code: 'permission_denied', message: 'Permission denied' }), 'account_restricted'],
    [400, JSON.stringify({ code: 'invalid_parameter', message: 'bad thing' }), 'payload_rejected'],
  ];
  for (const [st, body, reason] of cases) {
    const h = home(php(base));
    const r = run(h, st, body);
    assert.equal(r.status, 4, r.out);
    assert.match(r.out, new RegExp(`provider_status=${st} outcome=refused reason=${reason}`));
    noLeak(r.out);
    assert.ok(fs.existsSync(marker(h)), 'marker must exist so a failure is never retried');
  }
});

test('refuses before any request (exit 2, no marker) on unsafe or incomplete preconditions', () => {
  const cases = [
    undefined,
    php({ ...base, mode: 'production' }),
    php({ ...base, brevo_api_key: 'SET_ON_SERVER_ONLY' }),
    php({ ...base, test_recipient_email: 'SET_TEST_INBOX' }),
    php({ ...base, allowed_origins: [] }),
    '<?php echo "LEAK-OUTPUT"; return 5;',
    '<?php this is a parse error',
  ];
  for (const c of cases) {
    const h = home(c);
    const r = run(h, 201, '{}');
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /REFUSED:.*No request was made/);
    assert.ok(!r.out.includes('LEAK-OUTPUT'));
    noLeak(r.out);
    if (c !== undefined) assert.ok(!fs.existsSync(marker(h)));
  }
  const h = home(php(base));
  assert.equal(run(h, 201, '{}', { lib: false }).status, 2);
  const priv = path.join(h, 'bonafide-private');
  const real = path.join(h, 'real.php'); fs.renameSync(path.join(priv, 'contact-config.php'), real);
  fs.symlinkSync(real, path.join(priv, 'contact-config.php'));
  assert.equal(run(h, 201, '{}').status, 2);
});
