// Issue #185: offline tests for the exact-path test cleanup/diagnosis script and its workflow. No hosting access, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = path.resolve('deploy/contact/test-path-cleanup.sh');
const WF = fs.readFileSync('.github/workflows/godaddy-contact-test-cleanup.yml', 'utf8');
const NAME = 'bf-contact-test-syDS0pTcdO8q';
const run = (h, mode) => { const r = spawnSync('bash', [SCRIPT, mode], { env: { ...process.env, BF_HOME: h }, encoding: 'utf8' }); return { status: r.status, out: r.stdout + r.stderr }; };
const fixture = (files = {}) => {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-clean-'));
  const d = path.join(h, 'public_html', NAME);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(h, 'public_html', 'index.php'), 'wordpress');
  for (const [n, c] of Object.entries(files)) fs.writeFileSync(path.join(d, n), c);
  return { h, d };
};
const KNOWN = { 'contact-submit.php': '<?php', 'contact-lib.php': '<?php' };

test('workflow pin matches the script and is manual, main-only, protected', () => {
  const pin = WF.match(/PIN_SCRIPT_SHA256: ([0-9a-f]{64})/)[1];
  assert.equal(pin, crypto.createHash('sha256').update(fs.readFileSync(SCRIPT)).digest('hex'));
  assert.match(WF, /workflow_dispatch:/);
  assert.ok(!/^\s+(push|pull_request|schedule):/m.test(WF));
  assert.match(WF, /github\.ref == 'refs\/heads\/main'/);
  assert.match(WF, /environment: godaddy-contact-test-cleanup/);
  assert.match(WF, /StrictHostKeyChecking=yes/);
  assert.match(WF, /REMOVE_TEMP_TEST_FILES/);
  assert.match(WF, /APPROVE_LOG_STATUS_READ/);
});

test('workflow and script contain no recursive delete, no Brevo/network call, no wildcard delete', () => {
  const s = fs.readFileSync(SCRIPT, 'utf8');
  for (const t of [s, WF.replace("trap 'rm -rf \"$work\"' EXIT", '')]) {
    assert.ok(!/rm\s+-[a-zA-Z]*r|rm\s+--recursive|find .*-delete/.test(t));
    assert.ok(!/brevo|curl |wget |api-key/i.test(t.replace(/Brevo call/g, '')));
  }
  assert.ok(!/contact-config|bonafide-private/.test(s));
});

test('inspect is read-only, lists names/types, and never reads contents', () => {
  const { h, d } = fixture({ ...KNOWN, '.hidden': 'SECRET-CONTENT', error_log: 'SECRET-CONTENT', 'we ird;name': 'x' });
  fs.mkdirSync(path.join(d, 'sub')); fs.writeFileSync(path.join(d, 'sub', 'deep.txt'), 'x');
  const before = fs.readdirSync(d).sort();
  const r = run(h, 'inspect');
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /\.hidden .*known=NO/); assert.match(r.out, /error_log .*type=file/); assert.match(r.out, /sub .*type=dir/);
  assert.match(r.out, /<unprintable-name>/); assert.ok(!r.out.includes('we ird')); assert.ok(!r.out.includes('deep.txt'));
  assert.ok(!r.out.includes('SECRET-CONTENT'));
  assert.deepEqual(fs.readdirSync(d).sort(), before);
});

test('cleanup removes exactly the two known files and the then-empty folder; webroot untouched', () => {
  const { h, d } = fixture(KNOWN);
  const r = run(h, 'cleanup');
  assert.equal(r.status, 0, r.out);
  assert.ok(!fs.existsSync(d));
  assert.equal(fs.readFileSync(path.join(h, 'public_html', 'index.php'), 'utf8'), 'wordpress');
});

test('cleanup with only one known file present still succeeds', () => {
  const { h, d } = fixture({ 'contact-lib.php': '<?php' });
  assert.equal(run(h, 'cleanup').status, 0); assert.ok(!fs.existsSync(d));
});

test('cleanup fails closed on an unknown file (incl. hidden): known files removed, nothing else deleted, folder kept', () => {
  for (const extra of ['error_log', '.htaccess', 'notes.txt']) {
    const { h, d } = fixture({ ...KNOWN, [extra]: 'keep me' });
    const r = run(h, 'cleanup');
    assert.equal(r.status, 3, r.out);
    assert.match(r.out, /FAIL-CLOSED/); assert.match(r.out, /OWNER DECISION NEEDED/);
    assert.deepEqual(fs.readdirSync(d), [extra]);
    assert.equal(fs.readFileSync(path.join(d, extra), 'utf8'), 'keep me');
  }
});

test('cleanup never descends into or removes a subdirectory, and never follows a symlink', () => {
  const { h, d } = fixture({ 'contact-lib.php': '<?php' });
  fs.mkdirSync(path.join(d, 'sub')); fs.writeFileSync(path.join(d, 'sub', 'a'), 'x');
  const outside = path.join(h, 'outside.txt'); fs.writeFileSync(outside, 'precious');
  fs.symlinkSync(outside, path.join(d, 'contact-submit.php'));
  const r = run(h, 'cleanup');
  assert.equal(r.status, 3, r.out);
  assert.match(r.out, /SKIP contact-submit\.php: is a symlink/);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'precious');
  assert.ok(fs.existsSync(path.join(d, 'sub', 'a')));
});

test('absent folder is a clean no-op; symlinked public_html or test folder is refused', () => {
  const { h, d } = fixture(); fs.rmdirSync(d);
  assert.equal(run(h, 'cleanup').status, 0); assert.match(run(h, 'inspect').out, /absent/);
  const t = fixture(KNOWN); const real = path.join(t.h, 'real'); fs.mkdirSync(real);
  fs.rmSync(t.d, { recursive: true }); fs.symlinkSync(real, t.d);
  assert.equal(run(t.h, 'cleanup').status, 2); assert.ok(fs.existsSync(real));
  const u = fixture(KNOWN); const pub = path.join(u.h, 'public_html'); fs.renameSync(pub, path.join(u.h, 'pub2')); fs.symlinkSync(path.join(u.h, 'pub2'), pub);
  assert.equal(run(u.h, 'inspect').status, 2);
});

test('invalid mode is rejected', () => { assert.equal(run(fixture().h, 'rm-all').status, 2); });

test('log-status prints only counted handler status lines and no other log content', () => {
  const log = [
    '[03-Nov-2026 08:00:00 UTC] bf-contact: delivery failed (provider_rejected, http 401)',
    '[03-Nov-2026 08:00:01 UTC] PHP Warning: user alice@example.test said SECRET-MESSAGE in /home/u/x.php',
    '[03-Nov-2026 08:01:00 UTC] bf-contact: delivery failed (provider_rejected, http 401)',
    'bf-contact: delivery failed (network, http 0) trailing-secret-api-key-xyz',
  ].join('\n');
  const { h } = fixture({ ...KNOWN, error_log: log });
  const r = run(h, 'log-status');
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /2 bf-contact: delivery failed \(provider_rejected, http 401\)/);
  assert.match(r.out, /1 bf-contact: delivery failed \(network, http 0\)/);
  for (const leak of ['alice', 'SECRET-MESSAGE', '/home/u', 'trailing-secret', 'UTC']) assert.ok(!r.out.includes(leak), leak);
});

test('log-status handles missing, symlinked and empty logs without reading elsewhere', () => {
  const a = fixture(KNOWN); assert.match(run(a.h, 'log-status').out, /Nothing read/);
  const b = fixture(KNOWN); const other = path.join(b.h, 'other.log'); fs.writeFileSync(other, 'bf-contact: delivery failed (network, http 0)');
  fs.symlinkSync(other, path.join(b.d, 'error_log')); assert.match(run(b.h, 'log-status').out, /Nothing read/);
  const c = fixture({ error_log: 'nothing relevant' }); assert.match(run(c.h, 'log-status').out, /no matching lines/);
});
