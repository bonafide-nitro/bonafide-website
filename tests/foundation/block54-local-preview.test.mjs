// Block 54 (Issue #124): local-only owner preview packaging. Synthetic fixtures; no network, no deploy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { packagePreview, PREVIEW_NOTICE } from '../../scripts/package-preview.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'b54-'));
const mkDist = (files) => {
  const dir = path.join(tmp(), 'dist');
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
};
const CLEAN = { 'index.html': '<!doctype html><title>x</title><meta name="robots" content="noindex">', 'products/index.html': '<!doctype html><title>p</title>' };

test('packages a clean dist into a zip with launcher, guide, info and untouched site files', () => {
  const dist = mkDist(CLEAN);
  const out = path.join(tmp(), 'out');
  const { zip, root, manifest } = packagePreview({ dist, out, commit: 'abc' });
  assert.ok(fs.existsSync(zip));
  assert.equal(manifest.fileCount, 2);
  for (const f of ['site/index.html', 'site/products/index.html', 'Open-Preview.command', 'READ-ME-FIRST.txt', 'PREVIEW-INFO.json']) assert.ok(fs.existsSync(path.join(root, f)), f);
  assert.equal(fs.readFileSync(path.join(root, 'site/index.html'), 'utf8'), fs.readFileSync(path.join(dist, 'index.html'), 'utf8'));
  assert.ok(fs.statSync(path.join(root, 'Open-Preview.command')).mode & 0o100, 'launcher must be executable');
  const info = JSON.parse(fs.readFileSync(path.join(root, 'PREVIEW-INFO.json'), 'utf8'));
  assert.equal(info.notice, PREVIEW_NOTICE);
  assert.match(info.notice, /not production QA clearance/i);
});

test('refuses to package a dist that fails the release-artifact preflight', () => {
  const dist = mkDist({ ...CLEAN, 'shell.php': '<?php' });
  assert.throws(() => packagePreview({ dist, out: path.join(tmp(), 'out') }), /preflight findings/);
});

test('refuses when dist is not built', () => {
  assert.throws(() => packagePreview({ dist: path.join(tmp(), 'nope'), out: path.join(tmp(), 'out') }), /npm run build/);
});

test('launcher serves locally only, publishes nothing and the guide warns against file://', () => {
  const sh = fs.readFileSync('scripts/preview/Open-Preview.command', 'utf8');
  assert.ok(sh.includes('127.0.0.1'));
  assert.ok(!/0\.0\.0\.0|curl|wget|scp|rsync|git push|ssh /.test(sh));
  assert.equal(spawnSync('bash', ['-n', 'scripts/preview/Open-Preview.command']).status, 0);
  const guide = fs.readFileSync('scripts/preview/READ-ME-FIRST.txt', 'utf8');
  assert.match(guide, /NOT the live website/);
  assert.match(guide, /Do not open site\/index\.html/);
});

test('workflow is read-only, secret-free and has no hosting step', () => {
  const y = fs.readFileSync('.github/workflows/preview-package.yml', 'utf8');
  assert.match(y, /permissions:\s*\n\s*contents: read/);
  assert.ok(!/secrets\.|environment:|deploy|pages|vercel|cloudflare/i.test(y.replace(/^#.*$/gm, '')));
  assert.match(y, /upload-artifact@v4/);
});

test('launcher actually serves built-style root-absolute routes over HTTP (when python3 is available)', async (t) => {
  if (spawnSync('python3', ['--version']).status !== 0) return t.skip('no python3');
  const dist = mkDist({ ...CLEAN, 'wp-content/uploads/a.png': 'PNG' });
  const { root } = packagePreview({ dist, out: path.join(tmp(), 'out') });
  const port = 18000 + Math.floor(Math.random() * 1000);
  const { spawn } = await import('node:child_process');
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: path.join(root, 'site'), stdio: 'ignore' });
  try {
    await new Promise((r) => setTimeout(r, 800));
    const ok = await fetch(`http://127.0.0.1:${port}/products/`);
    assert.equal(ok.status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${port}/wp-content/uploads/a.png`)).status, 200);
  } finally { srv.kill(); }
});
