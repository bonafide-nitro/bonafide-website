// Issue #174: offline tests for deploy/contact/install-private-config.sh using temporary HOME fixtures.
// No hosting access, no network, synthetic values only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const hasPhp = spawnSync('php', ['-v']).status === 0 && spawnSync('bash', ['-c', 'true']).status === 0;
const t = (name, fn) => test(name, { skip: !hasPhp && 'php/bash not installed' }, fn);
const SCRIPT = path.resolve('deploy/contact/install-private-config.sh');
const home = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bf-home-'));
const run = (h, mode) => { const r = spawnSync('bash', [SCRIPT, ...(mode ? [mode] : [])], { env: { ...process.env, BF_HOME: h }, encoding: 'utf8' }); return { status: r.status, out: r.stdout + r.stderr }; };
const mode = (p) => (fs.statSync(p).mode & 0o777).toString(8);
const SECRET = 'synthetic-secret-value-123';

t('default is dry-run and changes nothing', () => {
  const h = home(); fs.mkdirSync(path.join(h, 'public_html'));
  const r = run(h);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /dry-run/);
  assert.ok(!fs.existsSync(path.join(h, 'bonafide-private')));
  assert.deepEqual(fs.readdirSync(path.join(h, 'public_html')), []);
});

t('apply creates dirs 700, config 600 from template with storage_dir set, and is idempotent', () => {
  const h = home(); fs.mkdirSync(path.join(h, 'public_html'));
  let r = run(h, 'apply'); assert.equal(r.status, 0, r.out);
  const cfg = path.join(h, 'bonafide-private', 'contact-config.php');
  assert.equal(mode(cfg), '600'); assert.equal(mode(path.join(h, 'bonafide-private')), '700'); assert.equal(mode(path.join(h, 'bonafide-private/ratelimit')), '700');
  const txt = fs.readFileSync(cfg, 'utf8');
  assert.ok(txt.includes(path.join(h, 'bonafide-private/ratelimit'))); assert.ok(!txt.includes('CPANEL_USER'));
  assert.deepEqual(fs.readdirSync(path.join(h, 'public_html')), []);
  assert.match(r.out, /todo\] brevo_api_key: still the placeholder/);
  r = run(h, 'apply'); assert.equal(r.status, 0, r.out);
  assert.equal(fs.readFileSync(cfg, 'utf8'), txt);
});

t('existing config is never overwritten and values are never printed', () => {
  const h = home(); fs.mkdirSync(path.join(h, 'bonafide-private/ratelimit'), { recursive: true });
  const cfg = path.join(h, 'bonafide-private', 'contact-config.php');
  const body = `<?php return ['mode'=>'test','brevo_api_key'=>'${SECRET}','ip_salt'=>'${SECRET}-salt','sender_email'=>'s@s.example.test','sender_name'=>'S','recipient_email'=>'r@r.example.test','test_recipient_email'=>'t@t.example.test','allowed_origins'=>['https://x.example.test'],'storage_dir'=>'${h}/bonafide-private/ratelimit'];\n`;
  fs.writeFileSync(cfg, body, { mode: 0o644 });
  const r = run(h, 'apply'); assert.equal(r.status, 0, r.out);
  assert.equal(fs.readFileSync(cfg, 'utf8'), body);
  assert.equal(mode(cfg), '600');
  assert.ok(!r.out.includes(SECRET)); assert.ok(!r.out.includes('s@s.example.test'));
  assert.match(r.out, /config complete/);
  assert.equal(run(h, 'check').status, 0);
});

t('syntax error is reported without echoing the content', () => {
  const h = home(); fs.mkdirSync(path.join(h, 'bonafide-private/ratelimit'), { recursive: true });
  fs.writeFileSync(path.join(h, 'bonafide-private/contact-config.php'), `<?php return ['brevo_api_key' => '${SECRET}' 'x' => 1];\n`, { mode: 0o600 });
  const r = run(h, 'check');
  assert.match(r.out, /syntax error/); assert.ok(!r.out.includes(SECRET));
});

t('check mode is read-only and fails when private files are missing', () => {
  const h = home();
  const r = run(h, 'check');
  assert.equal(r.status, 1); assert.ok(!fs.existsSync(path.join(h, 'bonafide-private')));
});

t('rejects unknown mode', () => { assert.equal(run(home(), 'bogus').status, 64); });

t('symlinked bonafide-private into public_html is rejected before any change', () => {
  for (const mode of ['apply', 'check', 'dry-run']) {
    const h = home(); const pub = path.join(h, 'public_html'); fs.mkdirSync(pub);
    fs.symlinkSync(pub, path.join(h, 'bonafide-private'));
    const r = run(h, mode);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /symlink/);
    assert.deepEqual(fs.readdirSync(pub), [], `${mode} must not write into public_html`);
  }
});

t('check flags an empty sender_name as incomplete', () => {
  const h = home(); fs.mkdirSync(path.join(h, 'public_html'));
  run(h, 'apply');
  const cfg = path.join(h, 'bonafide-private', 'contact-config.php');
  const r = run(h, 'check');
  assert.match(r.out, /todo\] sender_name: (empty|still the placeholder)|sender_name set/);
  fs.writeFileSync(cfg, fs.readFileSync(cfg, 'utf8').replace(/'sender_name'\s*=>\s*'[^']*'/, "'sender_name' => ''"));
  assert.match(run(h, 'check').out, /todo\] sender_name: empty/);
});

t('requires PHP >= 8.1 and mbstring', () => {
  const fake = (name, body) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bf-php-')), name); fs.writeFileSync(f, `#!/bin/bash\n${body}\n`, { mode: 0o755 }); return f; };
  const h = home(); fs.mkdirSync(path.join(h, 'public_html'));
  const go = (php) => { const r = spawnSync('bash', [SCRIPT, 'check'], { env: { ...process.env, BF_HOME: h, BF_PHP: php }, encoding: 'utf8' }); return r.stdout + r.stderr; };
  assert.match(go(fake('php80', 'case "$2" in *80100*) exit 1;; esac; exec php "$@"')), /FAIL\] PHP 8\.1 or newer required/);
  assert.match(go(fake('php-nombstring', 'case "$2" in *mbstring*) exit 1;; esac; exec php "$@"')), /FAIL\] PHP mbstring extension missing/);
});
