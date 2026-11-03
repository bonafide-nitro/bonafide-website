// Issue #192: offline tests for the one-shot contact test-send script and its workflow. No hosting access, no network.
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
const B64 = fs.readFileSync(LIB).toString('base64');
const SECRET = 'xkeysib-' + 'a1b2c3d4'.repeat(8) + '-ZZZZ9999';
const TO = 'inbox-private@example.test';
const SENDER = 'sender-private@example.test';
const base = { mode: 'test', brevo_api_key: SECRET, sender_email: SENDER, sender_name: 'Site', recipient_email: 'prod@example.test', test_recipient_email: TO, allowed_origins: ['https://bonafidenitro.com'], storage_dir: '/nonexistent', ip_salt: 'saltvalue' };
const php = (o) => `<?php return ${JSON.stringify(o).replace(/^\{/, '[').replace(/\}$/, ']').replace(/"([a-z_]+)":/g, "'$1'=>").replace(/\[(\s*"https:[^\]]*)\]/g, '[$1]')};`;
const home = (cfg) => {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-send-'));
  if (cfg !== undefined) { fs.mkdirSync(path.join(h, 'bonafide-private')); fs.writeFileSync(path.join(h, 'bonafide-private', 'contact-config.php'), cfg); }
  return h;
};
const run = (h, status, extra = {}) => {
  const env = { ...process.env, BF_HOME: h, BF_LIB_B64: B64, ...extra };
  if (status !== undefined) env.BF_TEST_STATUS = String(status);
  const r = spawnSync('bash', [SCRIPT], { env, encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
};
const noLeak = (out) => { for (const l of [SECRET, 'xkeysib', TO, SENDER, 'saltvalue', 'Synthetic', 'prod@example.test']) assert.ok(!out.includes(l), `leaked ${l}: ${out}`); };
const marker = (h) => path.join(h, 'bonafide-private', 'contact-test-send.done');

test('workflow pins match files; manual, main-only, protected, confirm-gated, strict SSH', () => {
  assert.equal(WF.match(/PIN_SCRIPT_SHA256: ([0-9a-f]{64})/)[1], sha(SCRIPT));
  assert.equal(WF.match(/PIN_LIB_SHA256: ([0-9a-f]{64})/)[1], sha(LIB));
  assert.match(WF, /workflow_dispatch:/);
  assert.ok(!/^\s+(push|pull_request|schedule):/m.test(WF));
  assert.match(WF, /github\.ref == 'refs\/heads\/main'/);
  assert.match(WF, /environment: godaddy-contact-test-send/);
  assert.match(WF, /StrictHostKeyChecking=yes/);
  assert.match(WF, /SEND_ONE_TEST_EMAIL/);
  assert.ok(!/BF_HOME|BF_TEST_STATUS/.test(WF));
  assert.ok(!/public_html|scp |sftp /.test(WF.replace(/^\s*#.*$/gm, '')));
  assert.match(WF, /rssh "bash -s"/);
});

test('script: one hard-capped Brevo call, strict TLS, marker before send, test mode only, no secret-printing constructs', () => {
  assert.equal((SRC.match(/curl_init\(/g) || []).length, 1);
  assert.match(SRC, /\$calls > 1/);
  assert.match(SRC, /CURLOPT_SSL_VERIFYPEER => true/); assert.match(SRC, /CURLOPT_SSL_VERIFYHOST => 2/);
  assert.match(SRC, /CURLOPT_PROTOCOLS => CURLPROTO_HTTPS/); assert.match(SRC, /CURLOPT_FOLLOWLOCATION => false/);
  assert.ok(SRC.indexOf("fopen($marker, 'x')") < SRC.indexOf('bf_handle(['));
  assert.match(SRC, /'mode'|\['mode'\] \?\? null\) !== 'test'/);
  assert.ok(!/set -x|var_dump|print_r|error_log|\$brevo_body|curl_exec\(\$ch\);\s*\n\s*echo/.test(SRC));
  assert.match(SRC, /BF_TEST_STATUS="\$\{BF_HOME:\+\$\{BF_TEST_STATUS:-\}\}"/);
});

test('happy path: exactly one send, exit 0, marker written, temp dir removed, nothing secret printed', () => {
  const h = home(php(base));
  const r = run(h, 201);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^RESULT: handler_status=200 brevo_status=201 reason=sent/);
  assert.equal(r.out.trim().split('\n').length, 1);
  noLeak(r.out);
  assert.ok(fs.existsSync(marker(h)));
  assert.deepEqual(fs.readdirSync(h).filter((n) => n.startsWith('.bf-test-send')), []);
  assert.equal(fs.readFileSync(path.join(h, 'bonafide-private', 'contact-config.php'), 'utf8'), php(base));
});

test('second run refuses (one-shot), even after a failed first attempt', () => {
  const h = home(php(base));
  assert.equal(run(h, 201).status, 0);
  const r2 = run(h, 201);
  assert.equal(r2.status, 2); assert.match(r2.out, /REFUSED:.*marker.*No request was made/);
  const h2 = home(php(base));
  assert.equal(run(h2, 401).status, 4);
  assert.ok(fs.existsSync(marker(h2)));
  assert.equal(run(h2, 201).status, 2);
});

test('failure statuses map to fixed words and exit 4', () => {
  for (const [st, word] of [[401, 'provider_rejected'], [400, 'provider_rejected'], [429, 'provider_rate_limited'], [503, 'provider_error']]) {
    const r = run(home(php(base)), st);
    assert.equal(r.status, 4, r.out);
    assert.match(r.out, new RegExp(`handler_status=\\d+ brevo_status=${st} reason=${word}`));
    noLeak(r.out);
  }
});

test('refuses (exit 2, no marker, no request) on missing/symlink/production/placeholder/bad config', () => {
  const bad = [
    undefined,
    php({ ...base, mode: 'production' }),
    php({ ...base, brevo_api_key: 'SET_ON_SERVER_ONLY' }),
    php({ ...base, brevo_api_key: 'xkeysib-short' }),
    php({ ...base, sender_email: 'SET_VERIFIED_BREVO_SENDER' }),
    php({ ...base, test_recipient_email: 'SET_TEST_INBOX' }),
    php({ ...base, ip_salt: 'SET_RANDOM_STRING' }),
    php({ ...base, allowed_origins: [] }),
    '<?php echo "LEAK-OUTPUT"; return 5;',
    '<?php this is a parse error',
  ];
  for (const c of bad) {
    const h = home(c);
    const r = run(h, 201);
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /REFUSED:.*No request was made/);
    assert.ok(!r.out.includes('LEAK-OUTPUT')); noLeak(r.out);
    assert.ok(!fs.existsSync(marker(h)));
  }
  const h = home(undefined);
  fs.mkdirSync(path.join(h, 'bonafide-private'));
  const real = path.join(h, 'real.php'); fs.writeFileSync(real, php(base));
  fs.symlinkSync(real, path.join(h, 'bonafide-private', 'contact-config.php'));
  assert.equal(run(h, 201).status, 2);
});

test('refuses a symlinked marker and a missing/undecodable library', () => {
  const h = home(php(base));
  const target = path.join(h, 'elsewhere'); fs.writeFileSync(target, 'x');
  fs.symlinkSync(target, marker(h));
  assert.equal(run(h, 201).status, 2);
  assert.equal(fs.readFileSync(target, 'utf8'), 'x');
  const h2 = home(php(base));
  assert.equal(run(h2, 201, { BF_LIB_B64: '' }).status, 2);
  assert.equal(run(h2, 201, { BF_LIB_B64: '!!!notbase64' }).status, 2);
  assert.ok(!fs.existsSync(marker(h2)));
});

test('offline status hook is ignored without BF_HOME (no network call is faked in production)', () => {
  const env = { ...process.env, BF_LIB_B64: B64, BF_TEST_STATUS: '201', HOME: home(undefined) };
  delete env.BF_HOME;
  const r = spawnSync('bash', [SCRIPT], { env, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /REFUSED/);
});
