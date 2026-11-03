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

// Issue #189: 401/403 sub-classification, derived in memory from the Brevo error body.
const classifier = SRC.match(/\/\/ BF_CLASSIFY_BEGIN[^\n]*\n([\s\S]*?)\/\/ BF_CLASSIFY_END/)[1];
const classify = (body) => {
  const r = spawnSync('php', ['-r', `${classifier}\necho bf_classify_denied(file_get_contents('php://stdin'));`], { input: body, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};

test('401/403 bodies map to the fixed sub-classifications', () => {
  const ip = '203.0.113.77';
  assert.equal(classify(JSON.stringify({ message: `We have detected you are using an unrecognised IP address ${ip}. If you performed this action make sure to add the new address here: https://app.brevo.com/security/authorised_ips`, code: 'unauthorized' })), 'ip_not_authorized');
  assert.equal(classify(JSON.stringify({ message: 'Key not found', code: 'unauthorized' })), 'key_not_recognised');
  assert.equal(classify(JSON.stringify({ message: 'Your account is not yet activated', code: 'permission_denied' })), 'account_restricted');
  assert.equal(classify(JSON.stringify({ message: 'something new', code: 'unauthorized' })), 'unauthorized_unclassified');
  assert.equal(classify('<html>gateway</html>'), 'unauthorized_unclassified');
  assert.equal(classify(''), 'unauthorized_unclassified');
});

test('classifier output never contains body text, IPs or keys', () => {
  const words = new Set(['ip_not_authorized', 'key_not_recognised', 'account_restricted', 'unauthorized_unclassified']);
  for (const m of ['unrecognised IP address 203.0.113.77 ' + SECRET, 'Key not found ' + SECRET, 'x']) assert.ok(words.has(classify(JSON.stringify({ message: m }))));
});

test('script prints only status, fixed classification and fixed detail word on denial; body is not echoed', () => {
  assert.match(SRC, /detail=\$sub/);
  assert.ok(!/echo[^\n]*\$body|bf_done\([^\n]*\$body|bf_done\([^\n]*\$data/.test(SRC));
  assert.equal((SRC.match(/curl_init\(/g) || []).length, 1);
  assert.ok(!/curl_setopt[^\n]*(VERBOSE|STDERR|HEADER\b)/.test(SRC));
});
