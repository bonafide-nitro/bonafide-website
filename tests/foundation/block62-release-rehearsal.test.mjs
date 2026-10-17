// Block 62 (Issue #141): offline release-zip rehearsal. Synthetic fixtures only; no network, no host.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { packagePreview } from '../../scripts/package-preview.mjs';
import { rehearse, readZipEntries, checkEntries } from '../../scripts/rehearse-release.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'b62t-'));
const SITE = {
  'index.html': '<!doctype html><title>x</title>',
  '404.html': '<!doctype html><title>404</title>',
  'robots.txt': 'User-agent: *\nSitemap: https://bonafidenitro.com/sitemap.xml\n',
  'sitemap.xml': '<urlset/>',
  'products/index.html': '<!doctype html><title>p</title>',
};
const mkDist = (files = SITE) => {
  const dir = path.join(tmp(), 'dist');
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
};
const pack = (files) => { const dist = mkDist(files); return { dist, ...packagePreview({ dist, out: path.join(tmp(), 'out') }) }; };
const REDIRECTS = 'RewriteRule ^(.*)/amp/$ https://bonafidenitro.com/$1/ [R=301,L]\n' + 'RewriteRule ^contact/$ https://bonafidenitro.com/products/ [R=301,L]\nRewriteRule ^amp/$ https://bonafidenitro.com/ [R=301,L]\n';
const run = (zip, opts = {}) => rehearse({ zip, forbiddenStrings: ['quickdelivr'], ...opts });
const invariants = (r) => [...new Set(r.findings.map((f) => f.invariant))];

// Hand-built stored zip so entry names and unix modes can be unsafe on purpose.
const buildZip = (entries) => {
  const locals = []; const centrals = []; let offset = 0;
  for (const { name, body = '', mode = 0o100644 } of entries) {
    const nameBuf = Buffer.from(name); const data = Buffer.from(body);
    const crc = zlib.crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(10, 4); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nameBuf.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE((3 << 8) | 20, 4); ch.writeUInt16LE(10, 6);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt32LE(((mode << 16) >>> 0), 38); ch.writeUInt32LE(offset, 42);
    locals.push(lh, nameBuf, data); centrals.push(ch, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  const file = path.join(tmp(), 'x.zip');
  fs.writeFileSync(file, Buffer.concat([...locals, cd, end]));
  return file;
};
const R = 'bonafide-preview';
const good = () => [
  { name: `${R}/PREVIEW-INFO.json`, body: '{}' },
  ...Object.entries(SITE).map(([k, v]) => ({ name: `${R}/site/${k}`, body: v })),
];

test('the existing packaged preview zip passes, matches dist byte-for-byte and yields a copy plan', () => {
  const { zip, dist } = pack();
  const r = run(zip, { dist, redirects: REDIRECTS });
  assert.deepEqual(r.findings, []);
  assert.equal(r.copyPlan.files, Object.keys(SITE).length);
  assert.ok(r.copyPlan.neverCopy.includes('PREVIEW-INFO.json'));
});

test('central-directory reader lists real zip entries', () => {
  const { zip } = pack();
  const names = readZipEntries(fs.readFileSync(zip)).map((e) => e.name);
  assert.ok(names.includes(`${R}/site/index.html`) && names.includes(`${R}/PREVIEW-INFO.json`));
});

test('path traversal, absolute, backslash and duplicate entries are blocked (R2) and never extracted', () => {
  for (const bad of ['../evil.txt', `${R}/../../evil.txt`, '/abs/evil.txt', `${R}\\site\\x.html`, `${R}/site//x.html`]) {
    const r = run(buildZip([...good(), { name: bad, body: 'x' }]));
    assert.ok(invariants(r).includes('R2-entry-path'), bad);
    assert.equal(r.copyPlan, null);
  }
  const dup = run(buildZip([...good(), { name: `${R}/site/INDEX.html`, body: 'y' }]));
  assert.ok(invariants(dup).includes('R2-entry-path'));
});

test('symlink and special-file entries are blocked (R3)', () => {
  const r = run(buildZip([...good(), { name: `${R}/site/link`, body: '/etc/passwd', mode: 0o120777 }]));
  assert.ok(invariants(r).includes('R3-entry-type'));
  const fifo = run(buildZip([...good(), { name: `${R}/site/pipe`, body: '', mode: 0o010644 }]));
  assert.ok(invariants(fifo).includes('R3-entry-type'));
});

test('wrong webroot prefix and files outside site/ are blocked (R4)', () => {
  const wrongRoot = run(buildZip(good().map((e) => ({ ...e, name: e.name.replace(R, 'public_html') }))));
  assert.ok(invariants(wrongRoot).includes('R4-layout'));
  const stray = run(buildZip([...good(), { name: `${R}/wp-config.php`, body: '<?php' }]));
  assert.ok(invariants(stray).includes('R4-layout'));
  const noIndex = run(buildZip(good().filter((e) => !e.name.endsWith('site/404.html'))));
  assert.ok(invariants(noIndex).includes('R4-layout'));
});

test('site and mandatory site paths must be real directory / regular files (R4), never a crash', () => {
  const siteIsFile = run(buildZip([{ name: `${R}/PREVIEW-INFO.json`, body: '{}' }, { name: `${R}/site`, body: 'not a dir' }]));
  assert.ok(invariants(siteIsFile).includes('R4-layout'));
  const dirAsFile = run(buildZip([...good().filter((e) => !e.name.endsWith('site/404.html')), { name: `${R}/site/404.html/` }]));
  assert.ok(invariants(dirAsFile).includes('R4-layout'));
});

test('WordPress runtime, executable and server-config content in the package is blocked (R5)', () => {
  const r = run(buildZip([...good(), { name: `${R}/site/.htaccess`, body: 'x' }, { name: `${R}/site/shell.php`, body: '<?php' }]));
  assert.ok(invariants(r).includes('R5-site-content'));
});

test('staging noindex/auth overlay content or placeholders in production content are blocked (R6)', () => {
  const withSite = (extra) => buildZip([...good(), { name: `${R}/site/staging.txt`, body: extra }]);
  for (const body of ['Header always set X-Robots-Tag "noindex, nofollow"', 'AuthUserFile /x', 'see @@STAGING_AUTH_REALM@@']) {
    assert.ok(invariants(run(withSite(body))).includes('R6-env-separation'), body);
  }
  const noindexHome = good().map((e) => (e.name.endsWith('site/index.html') ? { ...e, body: '<meta name="robots" content="noindex">' } : e));
  assert.ok(invariants(run(buildZip(noindexHome))).includes('R6-env-separation'));
  const reordered = good().map((e) => (e.name.endsWith('site/index.html') ? { ...e, body: '<meta content="noindex, nofollow" name="robots">' } : e));
  assert.ok(invariants(run(buildZip(reordered))).includes('R6-env-separation'), 'meta attribute order must not hide noindex');
  const blocked = good().map((e) => (e.name.endsWith('robots.txt') ? { ...e, body: 'User-agent: *\nDisallow: /\n' } : e));
  assert.ok(invariants(run(buildZip(blocked))).includes('R6-env-separation'));
});

test('a redirect destination missing from the package is blocked (R7)', () => {
  const files = { ...SITE }; delete files['products/index.html'];
  const { zip } = pack(files);
  const r = run(zip, { redirects: REDIRECTS });
  assert.deepEqual(invariants(r), ['R7-redirect-target']);
});

test('package that differs from the recorded tree or from dist is blocked (R8)', () => {
  const { zip, dist } = pack();
  fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\n# changed after packaging\n');
  assert.ok(invariants(run(zip, { dist })).includes('R8-manifest'));
  const info = run(buildZip(good())); // PREVIEW-INFO.json '{}' records no tree hash
  assert.ok(invariants(info).includes('R8-manifest'));
});

test('unreadable or non-zip input is BLOCKED, not a crash (R1)', () => {
  assert.deepEqual(invariants(run(path.join(tmp(), 'missing.zip'))), ['R1-zip-structure']);
  const junk = path.join(tmp(), 'j.zip'); fs.writeFileSync(junk, 'not a zip');
  assert.deepEqual(invariants(run(junk)), ['R1-zip-structure']);
  assert.deepEqual(checkEntries([]).map((f) => f.invariant), ['R1-zip-structure']);
});

test('CLI prints PASS / BLOCKED with the invariant id and exits 0 / 1 / 2', () => {
  const { zip, dist } = pack();
  const cli = (...a) => spawnSync('node', ['scripts/rehearse-release.mjs', ...a], { encoding: 'utf8' });
  const redirects = path.join(tmp(), 'r.htaccess'); fs.writeFileSync(redirects, REDIRECTS);
  const ok = cli('--zip', zip, '--dist', dist, '--redirects', redirects);
  assert.equal(ok.status, 0); assert.match(ok.stdout, /^PASS:/);
  const bad = cli('--zip', buildZip([...good(), { name: '../x', body: '' }]));
  assert.equal(bad.status, 1); assert.match(bad.stdout, /BLOCKED:.*R2-entry-path/); assert.match(bad.stderr, /\[R2-entry-path\]/);
  assert.equal(cli('--zip').status, 2);
});

test('script is offline: no network, shell or credential access', () => {
  const src = fs.readFileSync('scripts/rehearse-release.mjs', 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/fetch\(|node:https?|node:net|process\.env|\b(?:curl|wget|ssh|scp|rsync|cpanel)\b/i.test(src));
});
