// Block 59 (Issue #135): offline Apache config artifacts, staging/production separation and the fail-closed preflight.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { renderHtaccess, ARTIFACT_PATH } from '../../scripts/build-htaccess.mjs';
import {
  PRODUCTION_PATH, STAGING_OVERLAY_PATH, renderProduction, renderStagingOverlay, preflight, separationProblems,
  renderAll, OPEN_GATES, PLACEHOLDER_AUTH_FILE, PLACEHOLDER_AUTH_REALM,
} from '../../scripts/build-apache-config.mjs';

const prod = fs.readFileSync(PRODUCTION_PATH, 'utf8');
const overlay = fs.readFileSync(STAGING_OVERLAY_PATH, 'utf8');
const redirects = fs.readFileSync(ARTIFACT_PATH, 'utf8');
const effective = (t) => t.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

test('committed artifacts are byte-identical to a fresh deterministic generation', () => {
  assert.equal(prod, renderProduction());
  assert.equal(overlay, renderStagingOverlay());
  assert.equal(renderProduction(), renderProduction());
  for (const t of [prod, overlay]) { assert.equal(t.includes('\r'), false); assert.ok(t.endsWith('\n')); }
});

test('existing redirect artifact is untouched and embedded verbatim in production', () => {
  assert.equal(redirects, renderHtaccess());
  assert.ok(prod.includes(redirects.replace(/\n$/, '')));
  const count = (t) => effective(t).filter((l) => l.startsWith('RewriteRule ')).length;
  assert.equal(count(prod), count(redirects));
  assert.equal(count(redirects), 41);
});

test('production has a local 404 ErrorDocument and known MIME types, nothing else behavioural', () => {
  const eff = effective(prod);
  assert.deepEqual(eff.filter((l) => l.startsWith('ErrorDocument')), ['ErrorDocument 404 /404.html']);
  for (const ext of ['.xml', '.webp', '.woff2']) assert.ok(eff.some((l) => l.startsWith('AddType') && l.endsWith(` ${ext}`)), ext);
  assert.equal(eff.some((l) => /^(Redirect|RedirectMatch|FallbackResource|SetHandler|AddHandler)\b/.test(l)), false);
});

test('staging protection never leaks into production', () => {
  assert.equal(/x-robots-tag|noindex|nofollow/i.test(effective(prod).join('\n')), false);
  assert.equal(effective(prod).some((l) => /^(AuthType|AuthName|AuthUserFile|Require)\b/.test(l)), false);
  assert.equal(prod.includes('@@'), false);
  assert.deepEqual(separationProblems(), []);
  assert.deepEqual(preflight(prod, 'production'), []);
});

test('staging overlay requires human input AND enforces noindex, and fails closed', () => {
  assert.ok(overlay.includes(PLACEHOLDER_AUTH_FILE) && overlay.includes(PLACEHOLDER_AUTH_REALM));
  assert.ok(overlay.includes('Header always set X-Robots-Tag "noindex, nofollow"'));
  assert.ok(overlay.includes('Require valid-user'));
  assert.ok(/<IfModule !mod_headers\.c>[^<]*Require all denied/.test(overlay));
  // Require valid-user must live only inside the mod_headers branch, otherwise it is OR-ed with the denial.
  assert.ok(/<IfModule mod_headers\.c>[^]*Require valid-user[^]*<\/IfModule>/.test(overlay));
  assert.equal(overlay.split('\n').filter((l) => /^Require\b/.test(l)).length, 0, 'no uncontained Require');
  assert.ok(preflight(overlay, 'staging').length > 0, 'template with placeholders must be blocked');
  assert.equal(/password|passwd:|:\$apr1\$|\$2y\$/i.test(overlay.replace(/AuthUserFile|htpasswd/gi, '')), false, 'no credential material');
  const filled = overlay.replace(PLACEHOLDER_AUTH_FILE, '/home/example/.private/staging.htpasswd').replace(PLACEHOLDER_AUTH_REALM, 'Staging');
  assert.deepEqual(preflight(filled, 'staging'), []);
});

test('preflight blocks unsafe production configs', () => {
  const bad = {
    'noindex header': prod + '\nHeader always set X-Robots-Tag "noindex, nofollow"\n',
    'basic auth': prod + '\nAuthType Basic\n',
    'valid-user': prod + '\nRequire valid-user\n',
    'placeholder': prod + '\n# x\nAuthUserFile @@X@@\n',
    'no 404': prod.replace('ErrorDocument 404 /404.html', ''),
    'external 404': prod.replace('ErrorDocument 404 /404.html', 'ErrorDocument 404 https://bonafidenitro.com/'),
    'other 404 path': prod.replace('ErrorDocument 404 /404.html', 'ErrorDocument 404 /index.html'),
    '302 redirect': prod.replace('R=301,L]', 'R=302,L]'),
    'alias redirect': prod + '\nRedirect 301 /a /b\n',
    'fallback': prod + '\nFallbackResource /index.html\n',
    'uploads rule': prod + '\nRewriteRule ^wp-content/uploads/x$ / [R=301,L]\n',
    'php handler': prod + '\nAddHandler application/x-httpd-php .html\n',
    'missing redirects': prod.replace(redirects.replace(/\n$/, ''), '# removed'),
    'dropped rule': prod.replace(/RewriteRule \^contact\/\$[^\n]*\n/, ''),
    'lowercase alias redirect': prod + '\nredirect 302 /old https://example.com/new\n',
    'lowercase redirectmatch': prod + '\nredirectmatch 301 ^/a /b\n',
    'lowercase 302 rewrite': prod.replace('RewriteRule', 'rewriterule').replace('R=301,L]', 'r=302,L]'),
    'lowercase extra rewriterule': prod + '\nrewriterule ^zzz$ /yyy [R=301,L]\n',
    'lowercase errordocument path': prod.replace('ErrorDocument 404 /404.html', 'errordocument 404 /404.HTML'),
    'lowercase auth': prod + '\nauthtype basic\nrequire valid-user\n',
  };
  for (const [name, text] of Object.entries(bad)) assert.ok(preflight(text, 'production').length > 0, name);
  assert.ok(preflight('x', 'nope').length > 0);
});

test('preflight blocks incomplete staging configs', () => {
  const filled = overlay.replace(PLACEHOLDER_AUTH_FILE, '/home/example/.private/staging.htpasswd').replace(PLACEHOLDER_AUTH_REALM, 'Staging');
  const bad = {
    'no noindex': filled.replace(/Header always set[^\n]*\n/, ''),
    'weaker noindex': filled.replace('noindex, nofollow', 'noindex'),
    'no auth requirement': filled.replace('Require valid-user\n', ''),
    'no fail-closed': filled.replace('Require all denied', ''),
    'uncontained valid-user overrides denial': filled.replace(/<IfModule mod_headers\.c>[\s\S]*<\/IfModule>\n/, (m) => m.replace(/ {2}(AuthType|AuthName|AuthUserFile|Require valid-user)[^\n]*\n/g, '')) + 'AuthType Basic\nAuthName "x"\nAuthUserFile /home/e/.p/h\nRequire valid-user\n',
    'authfile in docroot': filled.replace('/home/example/.private', '/home/example/public_html'),
  };
  for (const [name, text] of Object.entries(bad)) assert.ok(preflight(text, 'staging').length > 0, name);
});

test('artifacts stay out of dist and carry no host, secret or deploy command', () => {
  const all = Object.values(renderAll()).join('\n');
  assert.equal(/\b(rsync|scp|sftp|ssh|curl|wget|ln -s)\b/.test(all), false);
  assert.equal(/staging\.|\.pages\.dev|\.netlify\.app/i.test(all), false);
  assert.equal(/AuthUserFile\s+\/(?!\S*public_html)/.test(prod), false);
  if (fs.existsSync('dist')) assert.equal(fs.existsSync('dist/.htaccess'), false);
});

test('open host gates are recorded, not assumed', () => {
  const g = OPEN_GATES.join('\n');
  for (const k of ['D1', 'mod_headers', 'AllowOverride', 'staging']) assert.ok(g.includes(k), k);
});

test('CLI: --check passes, --preflight blocks the raw template and never writes', () => {
  execFileSync('node', ['scripts/build-apache-config.mjs', '--check']);
  const r = spawnSync('node', ['scripts/build-apache-config.mjs', '--preflight', STAGING_OVERLAY_PATH, '--target', 'staging'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /BLOCKED/);
  const tmp = path.join(os.tmpdir(), `b59-${process.pid}.htaccess`);
  fs.writeFileSync(tmp, prod + '\nHeader always set X-Robots-Tag "noindex"\n');
  try {
    assert.equal(spawnSync('node', ['scripts/build-apache-config.mjs', '--preflight', tmp, '--target', 'production']).status, 1);
  } finally { fs.rmSync(tmp, { force: true }); }
  assert.equal(execFileSync('node', ['scripts/build-apache-config.mjs', '--preflight', PRODUCTION_PATH, '--target', 'production'], { encoding: 'utf8' }).includes('preflight ok'), true);
});
