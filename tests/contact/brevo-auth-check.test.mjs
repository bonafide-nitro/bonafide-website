// Issue #187: offline tests for the read-only Brevo auth check script and its workflow. No hosting access, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = path.resolve('deploy/contact/brevo-auth-check.sh');
const SRC = fs.readFileSync(SCRIPT, 'utf8');
const WF = fs.readFileSync('.github/workflows/godaddy-brevo-auth-check.yml', 'utf8');
const run = (h) => { const r = spawnSync('bash', [SCRIPT], { env: { ...process.env, BF_HOME: h }, encoding: 'utf8' }); return { status: r.status, out: r.stdout + r.stderr }; };
const SECRET = 'xkeysib-' + 'a1b2c3d4'.repeat(8) + '-ZZZZ9999';
const home = (cfg) => {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-auth-'));
  if (cfg !== undefined) { fs.mkdirSync(path.join(h, 'bonafide-private')); fs.writeFileSync(path.join(h, 'bonafide-private', 'contact-config.php'), cfg); }
  return h;
};
const cfg = (o) => `<?php return ${JSON.stringify(o).replace(/^\{/, '[').replace(/\}$/, ']').replace(/"([a-z_]+)":/g, "'$1'=>")};`;

test('workflow pin matches script and is manual, main-only, protected, confirm-gated', () => {
  assert.equal(WF.match(/PIN_SCRIPT_SHA256: ([0-9a-f]{64})/)[1], crypto.createHash('sha256').update(fs.readFileSync(SCRIPT)).digest('hex'));
  assert.match(WF, /workflow_dispatch:/);
  assert.ok(!/^\s+(push|pull_request|schedule):/m.test(WF));
  assert.match(WF, /github\.ref == 'refs\/heads\/main'/);
  assert.match(WF, /environment: godaddy-brevo-auth-check/);
  assert.match(WF, /StrictHostKeyChecking=yes/);
  assert.match(WF, /VERIFY_BREVO_AUTH/);
  assert.ok(!/rm\s+-[a-zA-Z]*r(?!.*work)/.test(WF.replace(/rm -rf "\$work"/g, '')));
});

test('script makes exactly one fixed GET to the Brevo account endpoint with strict TLS and prints no body/key', () => {
  assert.equal((SRC.match(/curl_init\(/g) || []).length, 1);
  assert.match(SRC, /https:\/\/api\.brevo\.com\/v3\/account/);
  assert.match(SRC, /CURLOPT_SSL_VERIFYPEER => true/); assert.match(SRC, /CURLOPT_SSL_VERIFYHOST => 2/);
  assert.match(SRC, /CURLOPT_PROTOCOLS => CURLPROTO_HTTPS/); assert.match(SRC, /CURLOPT_FOLLOWLOCATION => false/);
  assert.ok(!/smtp\/email|CURLOPT_POST|POSTFIELDS|sendmail|mail\(/i.test(SRC));
  assert.ok(!/echo[^\n]*\$(key|config|body|res)/.test(SRC));
  assert.ok(!/set -x|var_dump|print_r/.test(SRC));
  assert.match(SRC, /does NOT prove sender/i);
});

test('fails closed (exit 2, no request, no secret printed) when config missing / production / malformed key / placeholder', () => {
  const cases = [
    undefined,
    cfg({ mode: 'production', brevo_api_key: SECRET }),
    cfg({ mode: 'test', brevo_api_key: 'SET_ON_SERVER_ONLY' }),
    cfg({ mode: 'test', brevo_api_key: 'xkeysib-short' }),
    cfg({ mode: 'test', brevo_api_key: SECRET + ' \n' }),
    cfg({ mode: 'test' }),
    '<?php echo "LEAK-OUTPUT"; return 5;',
    '<?php this is a parse error',
  ];
  for (const c of cases) {
    const r = run(home(c));
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /REFUSED:.*No request was made/);
    assert.ok(!r.out.includes(SECRET) && !r.out.includes('LEAK-OUTPUT') && !r.out.includes('xkeysib'));
  }
});

test('symlinked config is refused', () => {
  const h = home(undefined);
  fs.mkdirSync(path.join(h, 'bonafide-private'));
  const real = path.join(h, 'real.php'); fs.writeFileSync(real, cfg({ mode: 'test', brevo_api_key: SECRET }));
  fs.symlinkSync(real, path.join(h, 'bonafide-private', 'contact-config.php'));
  assert.equal(run(h).status, 2);
});

// Issue #189: 401/403 bodies are classified in memory; only a fixed reason word is printed (never the body, message, key or IP).
const KEYCFG = cfg({ mode: 'test', brevo_api_key: SECRET });
const runFake = (status, body, withHome = true) => {
  const h = home(KEYCFG);
  const f = path.join(h, 'resp');
  fs.writeFileSync(f, `${status}\n${body}`);
  const env = { ...process.env, BF_TEST_RESPONSE: f };
  if (withHome) env.BF_HOME = h; else delete env.BF_HOME;
  const r = spawnSync('bash', [SCRIPT], { env, encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
};
const IP = '203.0.113.77';

test('401/403 reasons are classified without leaking body, IP or key', () => {
  const cases = [
    [401, JSON.stringify({ code: 'unauthorized', message: `We have detected you are using an unrecognised IP address ${IP}. If you performed this action make sure to add the new IP address in this link: https://app.brevo.com/security/authorised_ips` }), /http_status=401 classification=unauthorized reason=ip_not_authorized/],
    [401, JSON.stringify({ code: 'unauthorized', message: 'Key not found' }), /reason=key_not_recognised/],
    [403, JSON.stringify({ code: 'permission_denied', message: 'Permission denied' }), /http_status=403 classification=forbidden reason=account_restricted/],
    [401, JSON.stringify({ code: 'unauthorized', message: 'Your account is suspended' }), /reason=account_restricted/],
    [401, 'not json at all', /reason=unclassified/],
    [401, '', /reason=unclassified/],
  ];
  for (const [st, body, re] of cases) {
    const r = runFake(st, body);
    assert.equal(r.status, 4, r.out);
    assert.match(r.out, re);
    assert.equal(r.out.trim().split('\n').length, 1);
    for (const leak of [IP, 'unrecognised', 'Key not found', 'authorised_ips', 'suspended', SECRET, 'xkeysib', 'not json']) assert.ok(!r.out.includes(leak), `leaked ${leak}: ${r.out}`);
  }
});

test('200 and unexpected statuses keep their meaning under the offline hook', () => {
  assert.equal(runFake(200, '{"email":"x@example.test"}').status, 0);
  const r = runFake(500, 'oops');
  assert.equal(r.status, 5);
  assert.match(r.out, /http_status=500 classification=investigate/);
});

test('offline response hook is honoured only together with BF_HOME (never in the workflow)', () => {
  assert.match(SRC, /BF_TEST_RESPONSE="\$\{BF_HOME:\+\$\{BF_TEST_RESPONSE:-\}\}"/);
  assert.ok(!/BF_TEST_RESPONSE|BF_HOME/.test(WF));
  assert.match(WF, /rssh "bash -s" < "\$script"/);
});
