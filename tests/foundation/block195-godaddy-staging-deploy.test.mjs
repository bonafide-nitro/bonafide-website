// Issue #195: private GoDaddy staging deploy. Everything here is offline: the remote script runs against a throwaway HOME.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { makeSite, assemble, renderHtaccess, contactProblems, STAGING_ROBOTS } from '../../scripts/staging-package.mjs';
import { preflight } from '../../scripts/build-apache-config.mjs';

const wf = fs.readFileSync('.github/workflows/godaddy-staging-deploy.yml', 'utf8');
const doc = fs.readFileSync('docs/GODADDY_STAGING_DEPLOY.md', 'utf8');
const REMOTE = path.resolve('deploy/staging/staging-remote.sh');
const COMMIT = 'a'.repeat(40);
const NONCE = 'b'.repeat(32);
const tmp = () => fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'stg-'));

// ---------- workflow shape ----------
test('workflow is manual-only, main-only, protected, read-only token', () => {
  const on = wf.match(/^on:\n((?:[ ]+.*\n)+)/m)[1];
  assert.match(on, /workflow_dispatch:/);
  assert.doesNotMatch(on, /push|pull_request|schedule|workflow_run|repository_dispatch/);
  assert.match(wf, /^permissions:\n  contents: read$/m);
  assert.equal((wf.match(/github\.ref == 'refs\/heads\/main'/g) ?? []).length, 1);
  assert.match(wf, /needs: gate/);
  assert.match(wf, /godaddy-staging-preflight/);
  assert.match(wf, /godaddy-staging-deploy/);
  assert.match(wf, /default: dry-run/);
});

test('deploy needs an exact confirm phrase and the exact commit SHA; rollback needs its own phrase', () => {
  assert.match(wf, /DEPLOY_STAGING/);
  assert.match(wf, /ROLLBACK_STAGING/);
  assert.match(wf, /APPROVED_SHA" = "\$THIS_SHA"/);
});

test('build job holds no secrets and builds the MOCK contact form', () => {
  const build = wf.slice(wf.indexOf('\n  build:'), wf.indexOf('\n  staging:'));
  assert.doesNotMatch(build, /secrets\./);
  assert.doesNotMatch(build, /environment:/);
  assert.match(build, /PUBLIC_CONTACT_FORM_MODE: mock/);
  assert.doesNotMatch(wf, /PUBLIC_CONTACT_FORM_ENDPOINT|PUBLIC_CONTACT_FORM_MODE: live|PUBLIC_GTM_ID/);
});

test('SSH host key is pinned, never disabled; secrets are never traced', () => {
  assert.doesNotMatch(wf, /StrictHostKeyChecking=(no|accept-new)/);
  assert.match(wf, /StrictHostKeyChecking=yes/);
  assert.match(wf, /GODADDY_SSH_HOST_FINGERPRINT/);
  assert.match(wf, /set \+x/);
  assert.doesNotMatch(wf, /set -x|set -o xtrace/);
  assert.doesNotMatch(wf, /echo[^\n]*\$\{?(GODADDY_SSH_PRIVATE_KEY|STG_BASIC_PASSWORD|GODADDY_SSH_KEY_PASSPHRASE)/);
  // Basic credentials only reach curl through a private config file, never argv.
  assert.doesNotMatch(wf, /curl[^\n]*(-u |--user )/);
});

test('targets staging only; production host and live docroot are never a write target', () => {
  assert.match(wf, /STAGING_HOST: staging\.bonafidenitro\.com/);
  assert.doesNotMatch(wf, /vercel/i);
  // The only bonafidenitro.com URL besides staging is the informational HEAD.
  const urls = [...wf.matchAll(/https:\/\/([a-z.]*bonafidenitro\.com)/g)].map((m) => m[1]);
  assert.ok(urls.every((u) => u === 'bonafidenitro.com'), urls.join());
  assert.match(wf, /-I -w/);
  assert.doesNotMatch(wf, /(scp|sftp|rsync)\s/);
});

test('protection is proven before any build byte is uploaded', () => {
  const deploy = wf.slice(wf.indexOf('# ================= deploy'));
  const iProt = deploy.indexOf('upload staging-out/staging-protect.tgz');
  const iProve = deploy.indexOf('prove_protection "$nonce"');
  const iFull = deploy.indexOf('upload staging-out/staging-full.tgz');
  assert.ok(iProt > -1 && iProve > iProt && iFull > iProve);
  assert.match(wf, /\[ "\$code" = 401 \]/);
  assert.match(wf, /vhost-mismatch/);
});

test('remote script pin in the workflow equals the committed script', () => {
  const pin = wf.match(/PIN_REMOTE_SHA256: ([0-9a-f]{64})/)[1];
  assert.equal(pin, crypto.createHash('sha256').update(fs.readFileSync(REMOTE)).digest('hex'));
});

test('docs name every secret, environment and one-time owner step', () => {
  for (const s of ['GODADDY_SSH_HOST', 'GODADDY_SSH_PORT', 'GODADDY_SSH_USER', 'GODADDY_SSH_PRIVATE_KEY', 'GODADDY_SSH_HOST_FINGERPRINT',
    'GODADDY_STAGING_DOCROOT', 'GODADDY_STAGING_AUTH_FILE', 'GODADDY_STAGING_BASIC_USER', 'GODADDY_STAGING_BASIC_PASSWORD']) {
    assert.ok(doc.includes(s), s);
  }
  for (const s of ['GODADDY_STAGING_DOCROOT', 'GODADDY_STAGING_AUTH_FILE', 'GODADDY_STAGING_BASIC_USER', 'GODADDY_STAGING_BASIC_PASSWORD']) assert.ok(wf.includes(`secrets.${s}`), s);
  for (const s of ['godaddy-staging-preflight', 'godaddy-staging-deploy', 'Directory Privacy', 'AutoSSL', 'outside', 'auto-deploy']) assert.ok(doc.includes(s), s);
});

// ---------- packaging ----------
const fakeDist = () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'index.html'), '<!doctype html><title>x</title><p>hi</p>');
  fs.writeFileSync(path.join(d, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  return d;
};

test('rendered staging .htaccess passes the staging preflight and embeds the supplied paths', () => {
  const h = renderHtaccess({ docroot: '/home/u/staging.bonafidenitro.com', authFile: '/home/u/.htpasswds/staging/passwd' });
  assert.match(h, /^\s*AuthUserFile \/home\/u\/\.htpasswds\/staging\/passwd$/m);
  assert.match(h, /X-Robots-Tag "noindex, nofollow"/);
  assert.doesNotMatch(h, /@@/);
});

test('an auth file inside the docroot is rejected', () => {
  assert.throws(() => renderHtaccess({ docroot: '/home/u/stg', authFile: '/home/u/stg/passwd' }), /BLOCKED/);
});

test('live contact references fail the staging site', () => {
  const d = fakeDist();
  fs.writeFileSync(path.join(d, 'c.html'), '<form data-endpoint="/contact-submit.php">');
  assert.ok(contactProblems(d).length > 0);
});

test('assemble produces protection-only and full trees with auth, noindex, robots Disallow and marker', () => {
  const site = tmp(); fs.writeFileSync(path.join(site, 'index.html'), '<p>home</p>');
  const out = tmp();
  const base = { site, out, docroot: '/home/u/staging.bonafidenitro.com', authFile: '/home/u/.htpasswds/passwd', commit: COMMIT, nonce: NONCE };
  const prot = assemble({ ...base, kind: 'protect' });
  const full = assemble({ ...base, kind: 'full' });
  assert.notEqual(prot.digest, full.digest);
  assert.equal(assemble({ ...base, kind: 'full' }).digest, full.digest, 'deterministic');
  for (const k of ['protect', 'full']) {
    const t = path.join(out, `tree-${k}`);
    assert.match(fs.readFileSync(path.join(t, '.htaccess'), 'utf8'), /Require valid-user/);
    assert.equal(fs.readFileSync(path.join(t, 'robots.txt'), 'utf8'), STAGING_ROBOTS);
    assert.match(fs.readFileSync(path.join(t, '.bonafide-staging'), 'utf8'), new RegExp(`commit=${COMMIT}`));
  }
  assert.ok(fs.existsSync(path.join(out, 'tree-protect', `bf-probe-${NONCE}.txt`)));
  assert.ok(!fs.existsSync(path.join(out, 'tree-full', `bf-probe-${NONCE}.txt`)));
  assert.throws(() => assemble({ ...base, kind: 'protect', nonce: 'zz' }), /STG_NONCE/);
  assert.throws(() => assemble({ ...base, kind: 'full', commit: 'abc' }), /40-character/);
});

test('makeSite refuses a build with a stray .htaccess', () => {
  const d = fakeDist(); fs.writeFileSync(path.join(d, '.htaccess'), 'x');
  assert.throws(() => makeSite({ dist: d, out: tmp() }));
});

// ---------- remote script against a throwaway HOME ----------
const sandbox = () => {
  const home = tmp();
  fs.mkdirSync(path.join(home, 'public_html'));
  fs.writeFileSync(path.join(home, 'public_html', 'index.php'), 'WORDPRESS');
  fs.mkdirSync(path.join(home, '.htpasswds'));
  fs.writeFileSync(path.join(home, '.htpasswds', 'staging'), 'user:hash\n');
  return { home, docroot: path.join(home, 'staging.bonafidenitro.com'), auth: path.join(home, '.htpasswds', 'staging') };
};
const run = (sb, mode, env = {}) => {
  const r = spawnSync('bash', [REMOTE, mode], {
    env: { PATH: process.env.PATH, HOME: sb.home, STG_DOCROOT: sb.docroot, STG_AUTH_FILE: sb.auth, ...env }, encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout.trim() };
};
const snapshot = (dir) => spawnSync('find', [dir, '-printf', '%p %s %T@\\n'], { encoding: 'utf8' }).stdout;
const pack = (sb, kind, out = tmp()) => {
  const site = tmp(); fs.writeFileSync(path.join(site, 'index.html'), `<p>${kind}</p>`);
  const a = assemble({ site, out, kind, docroot: sb.docroot, authFile: sb.auth, commit: COMMIT, nonce: NONCE });
  fs.copyFileSync(a.tgz, path.join(sb.home, '.bf-stg-incoming.tgz'));
  return a.digest;
};

test('remote preflight accepts a safe isolated docroot and writes nothing', () => {
  const sb = sandbox();
  const before = snapshot(sb.home);
  const r = run(sb, 'preflight');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^STAGING_PREFLIGHT_OK access=basic docroot_state=absent .*live_docroot_untouched=yes$/);
  assert.equal(snapshot(sb.home), before);
});

test('remote refuses every docroot that is, contains, is inside, or links to the live docroot', () => {
  const sb = sandbox();
  const cases = {
    'docroot-in-webroot': path.join(sb.home, 'public_html'),
    'docroot-in-webroot ': path.join(sb.home, 'public_html', 'staging'),
    'docroot-is-home': sb.home,
    'docroot-outside-home': '/tmp/staging',
    'docroot-dotsegment': `${sb.home}/x/../staging`,
    'docroot-charset': 'relative/dir',
    'docroot-trailing-slash': `${sb.docroot}/`,
  };
  for (const [reason, docroot] of Object.entries(cases)) {
    const r = run(sb, 'preflight', { STG_DOCROOT: docroot });
    assert.notEqual(r.code, 0, docroot);
    assert.match(r.out, new RegExp(`STAGING_FAIL reason=${reason.trim()}`), `${docroot}: ${r.out}`);
  }
  // symlink pointing at public_html
  fs.symlinkSync(path.join(sb.home, 'public_html'), sb.docroot);
  assert.match(run(sb, 'preflight').out, /docroot-symlink/);
  // docroot above the live docroot
  const sb2 = sandbox();
  const r2 = run(sb2, 'preflight', { STG_DOCROOT: sb2.home });
  assert.match(r2.out, /docroot-is-home/);
  // live docroot reached through a symlinked parent
  const sb3 = sandbox();
  fs.symlinkSync(path.join(sb3.home, 'public_html'), path.join(sb3.home, 'link'));
  const r3 = run(sb3, 'preflight', { STG_DOCROOT: path.join(sb3.home, 'link', 'staging') });
  assert.notEqual(r3.code, 0, r3.out);
});

test('remote refuses an auth file that is missing, empty, or inside the docroot or a web root', () => {
  const sb = sandbox();
  assert.match(run(sb, 'preflight', { STG_AUTH_FILE: path.join(sb.home, 'nope') }).out, /authfile-unusable/);
  fs.writeFileSync(path.join(sb.home, '.htpasswds', 'empty'), '');
  assert.match(run(sb, 'preflight', { STG_AUTH_FILE: path.join(sb.home, '.htpasswds', 'empty') }).out, /authfile-unusable/);
  assert.match(run(sb, 'preflight', { STG_AUTH_FILE: path.join(sb.docroot, 'passwd') }).out, /authfile-inside-docroot/);
  assert.match(run(sb, 'preflight', { STG_AUTH_FILE: path.join(sb.home, 'public_html', 'passwd') }).out, /authfile-in-webroot/);
});

test('remote refuses a docroot holding content that is not ours', () => {
  const sb = sandbox();
  fs.mkdirSync(sb.docroot); fs.writeFileSync(path.join(sb.docroot, 'wp-config.php'), 'x');
  assert.match(run(sb, 'preflight').out, /docroot-unrecognized-content/);
  fs.rmSync(path.join(sb.docroot, 'wp-config.php'));
  fs.mkdirSync(path.join(sb.docroot, '.well-known'));
  assert.match(run(sb, 'preflight').out, /docroot_state=empty/);
});

test('install swaps atomically, keeps a backup and AutoSSL material, and never touches public_html', () => {
  const sb = sandbox();
  fs.mkdirSync(sb.docroot); fs.mkdirSync(path.join(sb.docroot, '.well-known')); fs.writeFileSync(path.join(sb.docroot, '.well-known', 'dcv.txt'), 'keep');
  const live = snapshot(path.join(sb.home, 'public_html'));
  const sha1 = pack(sb, 'protect');
  const a = run(sb, 'install', { STG_TARBALL_SHA256: sha1 });
  assert.equal(a.code, 0, a.out);
  assert.match(a.out, /^STAGING_INSTALL_OK previous_docroot_state=empty backups_kept=1$/);
  assert.equal(fs.readFileSync(path.join(sb.docroot, '.well-known', 'dcv.txt'), 'utf8'), 'keep');
  assert.ok(fs.existsSync(path.join(sb.docroot, `bf-probe-${NONCE}.txt`)));
  assert.ok(!fs.existsSync(path.join(sb.home, '.bf-stg-incoming.tgz')), 'incoming tarball removed');
  const sha2 = pack(sb, 'full');
  const b = run(sb, 'install', { STG_TARBALL_SHA256: sha2 });
  assert.match(b.out, /previous_docroot_state=ours backups_kept=2/);
  assert.equal(fs.readFileSync(path.join(sb.docroot, 'index.html'), 'utf8'), '<p>full</p>');
  assert.ok(!fs.existsSync(path.join(sb.docroot, `bf-probe-${NONCE}.txt`)));
  assert.equal(snapshot(path.join(sb.home, 'public_html')), live);
  assert.equal(fs.readFileSync(path.join(sb.home, 'public_html', 'index.php'), 'utf8'), 'WORDPRESS');
});

test('only the newest 3 backups are kept', () => {
  const sb = sandbox();
  for (let i = 0; i < 5; i++) {
    const d = pack(sb, i % 2 ? 'full' : 'protect');
    assert.equal(run(sb, 'install', { STG_TARBALL_SHA256: d }).code, 0);
  }
  const kept = fs.readdirSync(sb.home).filter((n) => n.includes('.bf-prev-'));
  assert.equal(kept.length, 3);
});

test('rollback restores the previous protected tree and keeps the replaced one', () => {
  const sb = sandbox();
  assert.equal(run(sb, 'install', { STG_TARBALL_SHA256: pack(sb, 'protect') }).code, 0);
  assert.equal(run(sb, 'install', { STG_TARBALL_SHA256: pack(sb, 'full') }).code, 0);
  const r = run(sb, 'rollback');
  assert.equal(r.out, 'STAGING_ROLLBACK_OK');
  assert.equal(fs.readFileSync(path.join(sb.docroot, 'index.html'), 'utf8').includes('Private staging placeholder'), true);
  assert.ok(fs.readdirSync(sb.home).some((n) => n.includes('.bf-rolledback-')));
});

test('rollback refuses when there is no protected backup (e.g. the pre-existing unprotected docroot)', () => {
  const sb = sandbox();
  fs.mkdirSync(sb.docroot);
  assert.equal(run(sb, 'install', { STG_TARBALL_SHA256: pack(sb, 'protect') }).code, 0);
  const r = run(sb, 'rollback');
  assert.match(r.out, /STAGING_FAIL reason=no-protected-backup/);
});

test('install rejects a wrong checksum, an unprotected release, and unsafe tar members', () => {
  const sb = sandbox();
  pack(sb, 'full');
  assert.match(run(sb, 'install', { STG_TARBALL_SHA256: '0'.repeat(64) }).out, /tarball-sha-mismatch/);
  assert.ok(!fs.existsSync(sb.docroot));
  // release without protection
  const src = tmp(); fs.writeFileSync(path.join(src, 'index.html'), 'x'); fs.writeFileSync(path.join(src, '.bonafide-staging'), 'x');
  const tgz = path.join(sb.home, '.bf-stg-incoming.tgz');
  spawnSync('tar', ['-czf', tgz, '-C', src, '.']);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(tgz)).digest('hex');
  assert.match(run(sb, 'install', { STG_TARBALL_SHA256: sha }).out, /release-not-protected/);
  // traversal and symlink members
  const evil = tmp(); fs.symlinkSync('/etc', path.join(evil, 'etc'));
  spawnSync('tar', ['-czf', tgz, '-C', evil, '.']);
  const sha2 = crypto.createHash('sha256').update(fs.readFileSync(tgz)).digest('hex');
  assert.match(run(sb, 'install', { STG_TARBALL_SHA256: sha2 }).out, /tarball-special-member/);
  spawnSync('tar', ['-czf', tgz, '-C', evil, '--transform=s,^,../,', '.']);
  const sha3 = crypto.createHash('sha256').update(fs.readFileSync(tgz)).digest('hex');
  assert.match(run(sb, 'install', { STG_TARBALL_SHA256: sha3 }).out, /tarball-unsafe-path/);
  assert.ok(!fs.existsSync(sb.docroot));
});

test('remote script output is limited to fixed tokens (no paths, no file content)', () => {
  const sb = sandbox();
  const r = run(sb, 'preflight');
  assert.ok(!r.out.includes(sb.home));
  for (const bad of ['rm -rf /', 'set -x']) assert.ok(!fs.readFileSync(REMOTE, 'utf8').includes(bad));
});

// ---------- Issue #198: PUBLIC noindex staging (no Basic auth, no auth file) ----------
const wfAccess = () => wf.slice(wf.indexOf('staging:\n    needs'));

test('#198 public .htaccess is noindex + fail-closed only, with no authentication', () => {
  const h = renderHtaccess({ docroot: '/home/u/staging.bonafidenitro.com', access: 'public' });
  assert.match(h, /Header always set X-Robots-Tag "noindex, nofollow"/);
  assert.match(h, /Require all denied/);
  assert.doesNotMatch(h, /AuthType|AuthUserFile|valid-user|Require all granted/);
  assert.throws(() => renderHtaccess({ docroot: '/x', access: 'open' }), /access must be/);
});

test('#198 public preflight rejects anything beyond noindex + fail-closed', () => {
  const ok = renderHtaccess({ docroot: '/home/u/stg', access: 'public' });
  for (const bad of ['Require all granted', 'Header unset X-Robots-Tag', 'AuthType Basic', 'Redirect 301 / https://bonafidenitro.com/']) {
    const t = ok.replace('</IfModule>\n', `  ${bad}\n</IfModule>\n`);
    assert.ok(preflight(t, 'staging-public').length > 0, bad);
  }
  assert.ok(preflight(ok.replace('Header always set X-Robots-Tag "noindex, nofollow"', ''), 'staging-public').length > 0, 'noindex required');
});

test('#198 public assemble needs no auth file, keeps noindex + robots Disallow + marker, still deterministic', () => {
  const site = tmp(); fs.writeFileSync(path.join(site, 'index.html'), '<p>home</p>');
  const out = tmp();
  const base = { site, out, docroot: '/home/u/staging.bonafidenitro.com', commit: COMMIT, nonce: NONCE, access: 'public' };
  const full = assemble({ ...base, kind: 'full' });
  assert.equal(assemble({ ...base, kind: 'full' }).digest, full.digest);
  assemble({ ...base, kind: 'protect' });
  for (const k of ['full', 'protect']) {
    const t = path.join(out, `tree-${k}`);
    assert.doesNotMatch(fs.readFileSync(path.join(t, '.htaccess'), 'utf8'), /Auth|valid-user/);
    assert.match(fs.readFileSync(path.join(t, '.htaccess'), 'utf8'), /X-Robots-Tag "noindex, nofollow"/);
    assert.equal(fs.readFileSync(path.join(t, 'robots.txt'), 'utf8'), STAGING_ROBOTS);
    assert.match(fs.readFileSync(path.join(t, '.bonafide-staging'), 'utf8'), /access=public/);
  }
});

test('#198 remote script in public mode: no auth file needed, every docroot safety check stays', () => {
  const sb = sandbox();
  const env = { STG_ACCESS: 'public', STG_AUTH_FILE: '' };
  const r = run(sb, 'preflight', env);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^STAGING_PREFLIGHT_OK access=public docroot_state=absent/);
  for (const docroot of [path.join(sb.home, 'public_html'), path.join(sb.home, 'public_html', 'staging'), sb.home]) {
    const x = run(sb, 'preflight', { ...env, STG_DOCROOT: docroot });
    assert.notEqual(x.code, 0, docroot);
    assert.match(x.out, /^STAGING_FAIL reason=/);
  }
  assert.match(run(sb, 'preflight', { STG_ACCESS: 'bogus' }).out, /bad-access/);
});

test('#198 public install/rollback: noindex-only tree is accepted, a tree without noindex is not', () => {
  const sb = sandbox();
  const env = { STG_ACCESS: 'public', STG_AUTH_FILE: '' };
  const mk = (kind) => {
    const site = tmp(); fs.writeFileSync(path.join(site, 'index.html'), `<p>${kind}</p>`);
    const a = assemble({ site, out: tmp(), kind, docroot: sb.docroot, commit: COMMIT, nonce: NONCE, access: 'public' });
    fs.copyFileSync(a.tgz, path.join(sb.home, '.bf-stg-incoming.tgz'));
    return a.digest;
  };
  const a = run(sb, 'install', { ...env, STG_TARBALL_SHA256: mk('protect') });
  assert.equal(a.code, 0, a.out);
  assert.ok(fs.existsSync(path.join(sb.docroot, `bf-probe-${NONCE}.txt`)));
  assert.equal(run(sb, 'install', { ...env, STG_TARBALL_SHA256: mk('full') }).code, 0);
  assert.equal(run(sb, 'rollback', env).out, 'STAGING_ROLLBACK_OK');
  assert.ok(fs.existsSync(path.join(sb.docroot, `bf-probe-${NONCE}.txt`)));
  // a tree whose .htaccess lacks the noindex header is refused
  const bad = tmp(); fs.writeFileSync(path.join(bad, 'index.html'), 'x'); fs.writeFileSync(path.join(bad, '.bonafide-staging'), 'commit=x\n'); fs.writeFileSync(path.join(bad, '.htaccess'), '# nothing\n');
  const tgz = path.join(sb.home, '.bf-stg-incoming.tgz');
  spawnSync('tar', ['-czf', tgz, '-C', bad, '.']);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(tgz)).digest('hex');
  assert.match(run(sb, 'install', { ...env, STG_TARBALL_SHA256: sha }).out, /release-not-protected/);
});

test('#198 workflow: public mode is the default, needs its own consent phrase, no auth secrets, TLS+vhost proven before build upload', () => {
  assert.match(wf, /access:[\s\S]*default: public-noindex/);
  assert.match(wf, /DEPLOY_PUBLIC_STAGING/);
  assert.match(wf, /NOT private|not private|NOT access control|not access control/i);
  // Basic-auth secrets are required only in basic-auth mode
  assert.match(wf, /if \[ "\$ACCESS" = basic-auth \]; then required="\$required STG_DOCROOT STG_AUTH_FILE STG_BASIC_USER STG_BASIC_PASSWORD"/);
  // docroot derived read-only over the existing SSH connection, then re-validated
  assert.match(wf, /cd ~ && pwd -P/);
  assert.match(wf, /check_paths/);
  // nonce/vhost probe still precedes the build upload; TLS failure stops before any write
  const deploy = wf.slice(wf.indexOf('# ================= deploy'));
  assert.ok(deploy.indexOf('prove_protection "$nonce"') > -1 && deploy.indexOf('prove_protection "$nonce"') < deploy.indexOf('upload staging-out/staging-full.tgz'));
  assert.match(wf, /prove_vhost_public/);
  assert.match(wf, /\[stage=tls-or-dns\]/);
  // the host name stays a constant and production is never a write target
  assert.match(wf, /STAGING_HOST: staging\.bonafidenitro\.com/);
  assert.doesNotMatch(wf, /STAGING_HOST: \$\{\{/);
  assert.ok(wfAccess().includes('STG_ACCESS'));
});

test('#198 docs state that public staging is not private and name the single remaining step', () => {
  for (const s of ['DEPLOY_PUBLIC_STAGING', 'public-noindex', 'not private', 'noindex is not access control', 'AutoSSL']) assert.ok(doc.includes(s), s);
});

test('#198 correction: basic-auth can re-protect a recognized public release; public rollback rejects unproven restoration', () => {
  assert.match(wf, /recognized public-noindex release/);
  assert.match(wf, /grep -q '\^access=public' "\$work\/b" && has_noindex/);
  assert.match(wf, /not a recognized public-noindex staging release/);
  const rb = wf.slice(wf.indexOf('# ================= rollback'), wf.indexOf('# ================= package locally'));
  assert.match(rb, /000\) fail tls-or-dns/);
  assert.match(rb, /\*\)\s+fail verify/);
  assert.match(rb, /200\) has_noindex \|\| fail verify/);
});
