// Block 56 (Issue #128): internal link graph check. Synthetic fixtures; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkInternalLinks, resolveInternal } from '../../scripts/check-internal-links.mjs';

const mkDist = (files) => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'b56-')), 'dist');
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
};
const page = (body) => `<!doctype html><title>x</title><body>${body}</body>`;

test('resolves root-absolute, relative, same-origin absolute, fragment, query and file links', () => {
  const dist = mkDist({
    'index.html': page('<a href="/a/">a</a><a href="a/">rel</a><a href="https://bonafidenitro.com/a/#x">abs</a><a href="https://www.bonafidenitro.com/a/?q=1">www</a><a href="/f/doc.pdf">pdf</a><a href="#top">top</a><a href="&#x2F;a&#x2F;">esc</a><a href="/a/?x=1&amp;y=2">amp</a>'),
    'a/index.html': page('<a href="../">home</a><a href="../f/doc.pdf">pdf</a>'),
    'f/doc.pdf': '%PDF',
    '404.html': page('<a href="/">home</a>'),
  });
  const r = checkInternalLinks(dist);
  assert.deepEqual(r.findings, []);
  assert.ok(r.checked >= 10);
});

test('ignores external hosts, mailto/tel, javascript and canonical/alternate link tags', () => {
  const dist = mkDist({
    'index.html': `<!doctype html><link rel="canonical" href="https://bonafidenitro.com/nope/"><link rel="alternate" href="/nope-2/"><title>x</title>${'<a href="https://example.com/x/">e</a><a href="mailto:a@b.c">m</a><a href="tel:+1">t</a><a href="javascript:void(0)">j</a>'}`,
  });
  assert.deepEqual(checkInternalLinks(dist).findings, []);
});

test('reports a missing page, missing file, missing trailing slash and broken resource', () => {
  const dist = mkDist({
    'index.html': page('<a href="/missing/">m</a><a href="/f/gone.pdf">f</a><a href="/a">noslash</a><img src="/img/gone.png"><a href="/a/">ok</a>'),
    'a/index.html': page(''),
  });
  const r = checkInternalLinks(dist);
  assert.deepEqual(r.findings.map((f) => f.ref).sort(), ['/a', '/f/gone.pdf', '/img/gone.png', '/missing/']);
});

test('resolveInternal skips non-route schemes and outbound hosts', () => {
  assert.equal(resolveInternal('mailto:a@b.c', '/'), null);
  assert.equal(resolveInternal('https://example.com/', '/'), null);
  assert.deepEqual(resolveInternal('../x/?q=1#h', '/a/b/'), { path: '/a/x/' });
});

test('accepts extensionless generated files and rejects encoded path separators', () => {
  const dist = mkDist({
    'index.html': page('<a href="/LICENSE">lic</a><a href="/assets%2Fimg.png">enc</a><a href="/assets/caf%C3%A9.png">utf</a><a href="/nolic">nolic</a>'),
    'LICENSE': 'MIT',
    'assets/img.png': 'x',
    'assets/café.png': 'x',
  });
  const r = checkInternalLinks(dist);
  assert.deepEqual(r.findings.map((f) => f.ref).sort(), ['/assets%2Fimg.png', '/nolic']);
  assert.equal(r.findings.find((f) => f.ref === '/nolic').why, 'route without trailing slash');
});
