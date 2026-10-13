// Block 43 (Issue #103): release-artifact preflight. Fixtures are synthetic temp dirs; nothing here
// asserts anything about the live site, hosting, or a clean WordPress rollback copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildManifest, diffManifest, scanArtifact } from '../../scripts/check-release-artifact.mjs';
import { loadBaseline } from '../../src/lib/data.mjs';

const FORBIDDEN = ['quickdelivr', 'coredelivr', 'mpackage'];
const mk = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b43-'));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
};
const rules = (files) => scanArtifact(mk(files), FORBIDDEN).map((f) => f.rule);
const CLEAN = { 'index.html': '<!doctype html><title>x</title><script type="application/ld+json">{}</script>', 'wp-content/uploads/a.jpg': 'x', 'robots.txt': 'User-agent: *' };

test('clean synthetic artifact has no findings', () => assert.deepEqual(rules(CLEAN), []));

test('flags executable, backup, server-config and WordPress-runtime files', () => {
  assert.ok(rules({ ...CLEAN, 'wp-content/uploads/shell.php': '<?php' }).includes('disallowed-file-type'));
  assert.ok(rules({ ...CLEAN, 'backup.sql': 'x' }).includes('disallowed-file-type'));
  assert.ok(rules({ ...CLEAN, 'site.zip': 'x' }).includes('disallowed-file-type'));
  assert.ok(rules({ ...CLEAN, '.htaccess': 'x' }).includes('forbidden-file-name'));
  assert.ok(rules({ ...CLEAN, 'wp-config.php': 'x' }).includes('forbidden-file-name'));
  assert.ok(rules({ ...CLEAN, 'wp-content/themes/sydney/header.php': 'x' }).includes('forbidden-directory'));
  assert.ok(rules({ ...CLEAN, 'wp-admin/x.css': 'x' }).includes('forbidden-directory'));
});

test('flags injection strings, compromise identifiers and obfuscation primitives', () => {
  const page = (b) => ({ ...CLEAN, 'index.html': b });
  assert.ok(rules(page('<script src="//cdn.quickdelivr.com/mpackage.js"></script>')).includes('forbidden-string'));
  assert.ok(rules(page('<script>var kEWRpcHH=1</script>')).includes('forbidden-string'));
  assert.ok(rules(page('<script>eval(x)</script>')).includes('eval-call'));
  assert.ok(rules(page('<script>atob("eA==")</script>')).includes('atob-call'));
  assert.ok(rules(page('<script>document.write(1)</script>')).includes('document-write'));
  assert.ok(rules(page('<script>"\\x61\\x62\\x63\\x64\\x65\\x66\\x67\\x68"</script>')).includes('hex-escape-run'));
  assert.ok(rules(page('<link href="/wp-content/themes/sydney/style.css">')).includes('wp-theme-or-plugin-path'));
  assert.ok(rules(page('<meta http-equiv="refresh" content="0;url=x">')).includes('meta-refresh'));
  assert.ok(rules({ ...CLEAN, 'a.svg': '<svg><script>1</script></svg>' }).includes('svg-script'));
});

test('retained /wp-content/uploads/ media paths are not flagged', () => {
  assert.deepEqual(rules({ ...CLEAN, 'index.html': '<img src="/wp-content/uploads/2020/01/a.jpg">' }), []);
});

test('manifest is deterministic and diff reports missing/extra/changed', () => {
  const a = mk(CLEAN);
  const m1 = buildManifest(a);
  assert.deepEqual(buildManifest(a), m1);
  assert.equal(m1.fileCount, 3);
  assert.deepEqual(diffManifest(m1, buildManifest(a)), { missing: [], extra: [], changed: [] });
  fs.writeFileSync(path.join(a, 'robots.txt'), 'changed');
  fs.writeFileSync(path.join(a, 'new.txt'), 'n');
  fs.rmSync(path.join(a, 'wp-content/uploads/a.jpg'));
  assert.deepEqual(diffManifest(m1, buildManifest(a)), { missing: ['wp-content/uploads/a.jpg'], extra: ['new.txt'], changed: ['robots.txt'] });
  assert.notEqual(buildManifest(a).treeSha256, m1.treeSha256);
});

test('CLI exits 1 on a finding, 0 on a clean tree, and verifies a manifest', () => {
  const run = (dir, ...extra) => spawnSync('node', ['scripts/check-release-artifact.mjs', '--dir', dir, ...extra], { encoding: 'utf8' });
  const ok = mk(CLEAN);
  const manifestFile = path.join(os.tmpdir(), `b43-manifest-${process.pid}.json`);
  assert.equal(run(ok, '--write-manifest', manifestFile).status, 0);
  assert.equal(run(ok, '--verify-manifest', manifestFile).status, 0);
  fs.writeFileSync(path.join(ok, 'robots.txt'), 'tampered');
  assert.equal(run(ok, '--verify-manifest', manifestFile).status, 1);
  assert.equal(run(mk({ ...CLEAN, 'x.php': '' })).status, 1);
  assert.equal(run(path.join(os.tmpdir(), 'b43-does-not-exist')).status, 2);
});

test('the real built dist/ (when present) passes the preflight', { skip: !fs.existsSync('dist') }, () => {
  const findings = scanArtifact('dist', loadBaseline().preservationRules.forbiddenBuildStrings);
  assert.deepEqual(findings, []);
});
