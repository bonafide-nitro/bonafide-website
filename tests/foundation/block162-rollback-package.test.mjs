// Issue #162: offline rollback package and fail-closed prerequisite preflight. Synthetic fixtures; no host.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { packagePreview } from '../../scripts/package-preview.mjs';
import {
  REQUIRED_PREREQUISITES, checkPrerequisites, prepareRollbackPackage, releaseManifest, restoreOrderText, sha256sums, stage,
} from '../../scripts/rollback-package.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'b162r-'));
const HTACCESS = path.resolve('deploy/apache/production.htaccess');
const PREREQS = path.resolve('deploy/rollback/prerequisites.json');
const REDIRECTS = path.join(tmp(), 'redirects.htaccess');
fs.writeFileSync(REDIRECTS, 'RewriteRule ^contact/$ https://bonafidenitro.com/products/ [R=301,L]\n');
const SITE = {
  'index.html': '<!doctype html><title>Nitro</title>',
  '404.html': '<!doctype html><title>404</title>',
  'robots.txt': 'User-agent: *\nSitemap: https://bonafidenitro.com/sitemap.xml\n',
  'sitemap.xml': '<urlset/>',
  'products/index.html': '<!doctype html><title>p</title>',
  'images/a.png': 'png-bytes',
};
const mkZip = (files = SITE) => {
  const dist = path.join(tmp(), 'dist');
  for (const [rel, body] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dist, rel)), { recursive: true }); fs.writeFileSync(path.join(dist, rel), body); }
  return packagePreview({ dist, out: path.join(tmp(), 'out') }).zip;
};
const prep = (o = {}) => prepareRollbackPackage({ zip: mkZip(), htaccess: HTACCESS, redirects: REDIRECTS, out: path.join(tmp(), 'rb'), prerequisites: PREREQS, ...o });

test('manifest is deterministic, stage-ordered, and ends with the production .htaccess', () => {
  const site = path.join(tmp(), 'site');
  for (const [rel, body] of Object.entries(SITE)) { fs.mkdirSync(path.dirname(path.join(site, rel)), { recursive: true }); fs.writeFileSync(path.join(site, rel), body); }
  const a = releaseManifest(site, 'x\n');
  const b = releaseManifest(site, 'x\n');
  assert.deepEqual(a, b);
  assert.equal(a.files.at(-1).path, '.htaccess');
  assert.deepEqual(a.files.map((f) => f.stage), [...a.files.map((f) => f.stage)].sort((x, y) => x - y));
  assert.equal(stage('images/a.png'), 1);
  assert.ok(a.files.every((f) => /^[0-9a-f]{64}$/.test(f.sha256) && Number.isInteger(f.bytes)));
  assert.notEqual(releaseManifest(site, 'y\n').treeSha256, a.treeSha256, 'the .htaccess is part of the tree hash');
  assert.match(restoreOrderText(a), /No external service/);
  assert.equal(sha256sums(a).trim().split('\n').length, a.fileCount);
});

test('offline mode writes the package, reinstall simulation passes, prerequisites are reported OPEN', () => {
  const r = prep();
  assert.deepEqual(r.problems, []);
  assert.equal(r.prerequisites.confirmed.length, 0);
  assert.equal(r.prerequisites.open.length, REQUIRED_PREREQUISITES.length);
  assert.deepEqual(r.written.sort(), ['RESTORE-ORDER.txt', 'SHA256SUMS', 'bonafide-release.zip', 'bonafide-release.zip.sha256', 'production.htaccess', 'release-manifest.json']);
});

test('SHA256SUMS verifies with plain sha256sum against the extracted package plus the production .htaccess', () => {
  const out = path.join(tmp(), 'rb');
  assert.deepEqual(prep({ out }).problems, []);
  const scratch = tmp();
  assert.equal(spawnSync('unzip', ['-q', path.join(out, 'bonafide-release.zip'), '-d', scratch]).status, 0);
  const site = path.join(scratch, 'bonafide-preview', 'site');
  fs.copyFileSync(HTACCESS, path.join(site, '.htaccess'));
  assert.equal(spawnSync('sha256sum', ['-c', path.join(out, 'SHA256SUMS')], { cwd: site, encoding: 'utf8' }).status, 0);
  fs.appendFileSync(path.join(site, 'index.html'), 'tamper');
  assert.notEqual(spawnSync('sha256sum', ['-c', path.join(out, 'SHA256SUMS')], { cwd: site, encoding: 'utf8' }).status, 0, 'tampering is detected');
});

test('previous-release reinstall works between two different real packages', () => {
  const previousZip = mkZip({ ...SITE, 'old-only.html': '<!doctype html><title>old</title>', 'images/a.png': 'older-bytes' });
  const oldHt = path.join(tmp(), 'old.htaccess');
  fs.writeFileSync(oldHt, `${fs.readFileSync(HTACCESS, 'utf8')}# older release\n`);
  const r = prep({ previousZip, previousHtaccess: oldHt });
  assert.deepEqual(r.problems, []);
  assert.ok(prep({ previousZip }).problems.some((p) => /requires --previous-htaccess/.test(p)), 'a previous zip without its own .htaccess is refused');
});

test('a staging or malformed .htaccess is refused before anything is packaged', () => {
  const bad = path.join(tmp(), 'bad.htaccess');
  fs.writeFileSync(bad, 'Header set X-Robots-Tag "noindex, nofollow"\nAuthType Basic\n');
  const out = path.join(tmp(), 'rb-bad');
  const r = prep({ htaccess: bad, out });
  assert.ok(r.problems.some((p) => /production \.htaccess preflight/.test(p)));
  assert.equal(fs.existsSync(out), false);
});

test('RESTORE-ORDER verification command does not rely on a relative ../../ path', () => {
  const out = path.join(tmp(), 'rb');
  assert.deepEqual(prep({ out }).problems, []);
  assert.doesNotMatch(fs.readFileSync(path.join(out, 'RESTORE-ORDER.txt'), 'utf8'), /\.\.\/\.\.\/SHA256SUMS/);
});

test('cutover mode fails closed while any prerequisite is OPEN (as committed)', () => {
  const r = prep({ mode: 'cutover' });
  assert.ok(r.problems.some((p) => /cutover mode: 9 prerequisite/.test(p)));
});

test('prerequisite file: missing file, missing ids, unknown ids, bad evidence and fake confirmation are all rejected', () => {
  assert.ok(prep({ prerequisites: path.join(tmp(), 'nope.json') }).problems.some((p) => /unreadable/.test(p)));
  const doc = JSON.parse(fs.readFileSync(PREREQS, 'utf8'));
  assert.deepEqual(checkPrerequisites(doc).problems, []);
  assert.ok(checkPrerequisites({ prerequisites: doc.prerequisites.slice(1) }).problems.some((p) => /required prerequisite W1/.test(p)));
  assert.ok(checkPrerequisites({ prerequisites: [...doc.prerequisites, { id: 'W99', status: 'OPEN', evidence: null }] }).problems.some((p) => /unknown/.test(p)));
  const confirm = (evidence) => ({ prerequisites: doc.prerequisites.map((p, i) => (i ? p : { ...p, status: 'CONFIRMED', evidence })) });
  assert.ok(checkPrerequisites(confirm(null)).problems.some((p) => /requires a GitHub/.test(p)));
  assert.ok(checkPrerequisites(confirm('trust me')).problems.some((p) => /requires a GitHub/.test(p)));
  assert.ok(checkPrerequisites(confirm('https://example.com/backup')).problems.some((p) => /requires a GitHub/.test(p)));
  const ok = checkPrerequisites(confirm('https://github.com/bonafide-nitro/bonafide-website/issues/1#issuecomment-123'));
  assert.deepEqual(ok.problems, []);
  assert.equal(ok.confirmed.length, 1);
  assert.equal(checkPrerequisites({ prerequisites: doc.prerequisites.map((p) => ({ ...p, status: 'CONFIRMED', evidence: 'https://github.com/bonafide-nitro/bonafide-website/pull/9#issuecomment-5' })) }).open.length, 0);
  assert.ok(checkPrerequisites({}).problems.length);
});

test('an unsafe package is refused before any manifest is written', () => {
  const out = path.join(tmp(), 'rb');
  const r = prep({ zip: mkZip({ ...SITE, 'index.html': '<!doctype html><meta name="robots" content="noindex">' }), out });
  assert.ok(r.problems.some((p) => /R6-env-separation/.test(p)));
  assert.equal(fs.existsSync(out), false);
});

test('the committed prerequisites file makes no claim of a real backup', () => {
  const doc = JSON.parse(fs.readFileSync(PREREQS, 'utf8'));
  assert.ok(doc.prerequisites.every((p) => p.status === 'OPEN' && p.evidence === null));
});

test('the rollback package bundles the exact rehearsed .htaccess that the manifest records', () => {
  const out = path.join(tmp(), 'rb');
  const r = prep({ out });
  assert.deepEqual(r.problems, []);
  const bundled = fs.readFileSync(path.join(out, 'production.htaccess'));
  assert.deepEqual(bundled, fs.readFileSync(HTACCESS));
  const entry = r.manifest.files.find((f) => f.path === '.htaccess');
  assert.equal(createHash('sha256').update(bundled).digest('hex'), entry.sha256);
});

test('restore text is deletion-aware and W6/W8 match the approved install path and full package', () => {
  const siteDir = path.join(tmp(), 'site');
  for (const [rel, body] of Object.entries(SITE)) { fs.mkdirSync(path.dirname(path.join(siteDir, rel)), { recursive: true }); fs.writeFileSync(path.join(siteDir, rel), body); }
  const text = restoreOrderText(releaseManifest(siteDir, 'x\n'));
  assert.match(text, /SSH\/SFTP/);
  assert.match(text, /File Manager/);
  assert.match(text, /Destination-only cleanup/);
  assert.match(text, /in the previously installed release manifest but NOT in this release/);
  const prereq = JSON.parse(fs.readFileSync(PREREQS, 'utf8')).prerequisites;
  const w6 = prereq.find((p) => p.id === 'W6-docroot-model-decided').requirement;
  const w8 = prereq.find((p) => p.id === 'W8-release-package-archived').requirement;
  assert.match(w6, /SSH\/SFTP/);
  assert.doesNotMatch(w6, /symlink flip or rsync copy/);
  assert.match(w8, /production\.htaccess/);
  assert.match(w8, /entire rollback package/);
});
