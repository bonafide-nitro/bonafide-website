// Block 61 (Issue #139): offline source-evidence intake tool.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspectHtml, inspectAsset, knownRoutes, run, IntakeError } from '../../scripts/intake-source-evidence.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'intake-'));
const write = (name, data) => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, data);
  return p;
};
const SAMPLE = `<!doctype html><html><head><title>How to Buy &amp; More</title>
<meta name="description" content="Where to buy">
<link rel="canonical" href="https://bonafidenitro.com/howtobuy/">
<script>alert(1)</script></head><body><h1>How to buy</h1><h2>Distributors</h2>
<p>Call   us today.</p>
<a href="https://dist.example.org/x">Dist</a><a href="javascript:void(0)">bad</a><a href="/products/">P</a>
<img src="/wp-content/uploads/a.jpg" alt=""><img src="/wp-content/uploads/b.jpg">
<iframe src="https://x.example"></iframe></body></html>`;
const routes = ['/', '/howtobuy/', '/products/'];
const codes = (r) => r.flags.map((f) => f.code);

test('knownRoutes reads src/pages and includes both product URLs separately', () => {
  const r = knownRoutes();
  assert.ok(r.includes('/') && r.includes('/howtobuy/') && r.includes('/products/') && r.includes('/products-2/'));
});

test('matching canonical verifies the route and inventories fields', () => {
  const r = inspectHtml(SAMPLE, '/howtobuy', routes);
  assert.equal(r.routeEvidence, 'match');
  assert.equal(r.title, 'How to Buy & More');
  assert.deepEqual(r.metaDescriptions, ['Where to buy']);
  assert.deepEqual(r.externalHosts, { 'dist.example.org': 1 });
  assert.equal(r.links.find((l) => l.href.startsWith('javascript')).class, 'unsafe-scheme');
  assert.equal(r.links.find((l) => l.href === '/products/').class, 'relative');
  assert.equal(r.images[0].altPresent, true);
  assert.equal(r.images[0].alt, '');
  assert.equal(r.images[1].altPresent, false);
  assert.equal(r.textSnippets[0], 'Call us today.');
  assert.equal(r.scriptCount, 1);
  assert.equal(r.iframeCount, 1);
  for (const c of ['unsafe-link-scheme', 'images-without-alt-attribute', 'scripts-present', 'iframes-present']) assert.ok(codes(r).includes(c), c);
});

test('report never embeds script bodies or raw markup', () => {
  const json = JSON.stringify(inspectHtml(SAMPLE, '/howtobuy/', routes));
  assert.doesNotMatch(json, /alert\(1\)/);
  assert.doesNotMatch(json, /<iframe|<script|<a /);
});

test('canonical pointing at another route is a mismatch; /products/ and /products-2/ stay distinct', () => {
  const html = SAMPLE.replace('/howtobuy/', '/products-2/');
  const r = inspectHtml(html, '/products/', ['/products/', '/products-2/']);
  assert.equal(r.routeEvidence, 'mismatch');
  assert.ok(codes(r).includes('route-mismatch'));
  assert.equal(inspectHtml(html, '/products-2/', ['/products/', '/products-2/']).routeEvidence, 'match');
});

test('no canonical/og:url leaves the route unverified; no meta description is flagged, never invented', () => {
  const r = inspectHtml('<html><head><title>T</title></head><body><h1>x</h1></body></html>', '/howtobuy/', routes);
  assert.equal(r.routeEvidence, 'none');
  assert.deepEqual(r.metaDescriptions, []);
  assert.ok(codes(r).includes('route-unverified') && codes(r).includes('no-meta-description'));
});

test('unknown route is flagged', () => {
  assert.ok(codes(inspectHtml(SAMPLE, '/nope/', routes)).includes('route-unknown'));
});

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

test('asset: PNG content under .png path passes; hash is sha256; absent from repo', () => {
  const r = inspectAsset(PNG, '/wp-content/uploads/2099/01/zz-intake-test.png');
  assert.equal(r.detectedType, 'image/png');
  assert.equal(r.flags.length, 0);
  assert.equal(r.inRepo, 'absent');
  assert.match(r.sha256, /^[0-9a-f]{64}$/);
});

test('asset: content/extension mismatch and unrecognised bytes are flagged', () => {
  assert.ok(codes(inspectAsset(PNG, '/wp-content/uploads/2099/01/x.jpg')).includes('content-extension-mismatch'));
  assert.ok(codes(inspectAsset(Buffer.from('<?php echo 1;'), '/wp-content/uploads/2099/01/x.png')).includes('unrecognised-content'));
});

test('asset: identical vs different against an existing repo binary', () => {
  const p = '/wp-content/uploads/2022/04/Bona-Fide-Facilities-1.jpg';
  const real = fs.readFileSync(`public${p}`);
  assert.equal(inspectAsset(real, p).inRepo, 'identical');
  const other = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(8)]);
  assert.ok(codes(inspectAsset(other, p)).includes('differs-from-repo-binary'));
});

test('asset: traversal and non-absolute expected paths are rejected', () => {
  for (const bad of ['/wp-content/../x.png', 'x.png', '/a\\b.png']) assert.throws(() => inspectAsset(PNG, bad), IntakeError);
});

test('asset: T7 manifest membership is reported', () => {
  const m = JSON.parse(fs.readFileSync('qa/t7-image-manifest.json', 'utf8')).images[0].path;
  assert.equal(inspectAsset(PNG, m).inT7Manifest, true);
});

test('run: refuses symlink input, binary HTML input, unsafe output dir, mixed modes', () => {
  const real = write('p.html', SAMPLE);
  const link = path.join(tmp, 'link.html');
  fs.symlinkSync(real, link);
  assert.throws(() => run(['--route', '/howtobuy/', '--html', link]), /symbolic link/);
  assert.throws(() => run(['--route', '/howtobuy/', '--html', write('bin.html', Buffer.from([0, 1, 2]))]), /binary/);
  assert.throws(() => run(['--route', '/howtobuy/', '--html', real, '--output', path.resolve('public/report.json')]), /refusing to write/);
  assert.throws(() => run(['--route', '/howtobuy/', '--asset', real]), /either/);
  assert.throws(() => run(['--bogus', 'x']), /unknown argument/);
});

test('run: writes report outside the repo content and leaves src/public untouched', () => {
  const before = spawnSync('git', ['status', '--porcelain', 'src', 'public']).stdout.toString();
  const out = path.join(tmp, 'report.json');
  run(['--route', '/howtobuy/', '--html', write('ok.html', SAMPLE), '--output', out]);
  assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).route, '/howtobuy/');
  assert.equal(spawnSync('git', ['status', '--porcelain', 'src', 'public']).stdout.toString(), before);
});

test('CLI: exit 0 with --output summary; exit 2 with error: on bad input', () => {
  const ok = spawnSync('node', ['scripts/intake-source-evidence.mjs', '--route', '/howtobuy/', '--html', write('c.html', SAMPLE), '--output', path.join(tmp, 'c.json')]);
  assert.equal(ok.status, 0);
  assert.match(ok.stdout.toString(), /^ok: html intake/);
  const bad = spawnSync('node', ['scripts/intake-source-evidence.mjs', '--route', '/howtobuy/', '--html', path.join(tmp, 'missing.html')]);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr.toString(), /^error:/);
});

test('run: refuses output through a symlink (file or parent dir) that lands in a protected dir', () => {
  const html = write('sym.html', SAMPLE);
  const protectedTarget = path.resolve('docs', 'block61-symlink-probe.json');
  const fileLink = path.join(tmp, 'file-link.json');
  fs.symlinkSync(protectedTarget, fileLink);
  assert.throws(() => run(['--route', '/howtobuy/', '--html', html, '--output', fileLink]), /refusing to write/);
  const dirLink = path.join(tmp, 'dir-link');
  fs.symlinkSync(path.resolve('docs'), dirLink);
  assert.throws(() => run(['--route', '/howtobuy/', '--html', html, '--output', path.join(dirLink, 'probe.json')]), /refusing to write/);
  assert.equal(fs.existsSync(protectedTarget), false);
});

test('script bodies nested in p/li/h/a are never in the report', () => {
  const html = '<h1>T<script>evilH()</script></h1><p>ok<script>malware()</script>end</p><ul><li>x<style>.q{}</style>y</li></ul><a href="/a/">go<script>evilA()</script></a><script>unterminated()';
  const json = JSON.stringify(inspectHtml(html, '/howtobuy/', routes));
  for (const bad of ['malware', 'evilH', 'evilA', 'unterminated', '.q{}']) assert.ok(!json.includes(bad), bad);
  assert.ok(json.includes('ok end'));
});

test('JSON-LD-only page counts its script and flags scripts-present without embedding the body', () => {
  const r = inspectHtml('<head><script type="application/ld+json">{"secret":1}</script></head><h1>x</h1>', '/howtobuy/', routes);
  assert.equal(r.scriptCount, 1);
  assert.ok(codes(r).includes('scripts-present'));
  assert.ok(!JSON.stringify(r).includes('secret'));
});

test('canonical/robots strings inside script bodies are not route or noindex evidence', () => {
  const html = '<head><link rel="canonical" href="https://bonafidenitro.com/howtobuy/"><script>var s=\'<link rel="canonical" href="https://bonafidenitro.com/other/"><meta name="robots" content="noindex">\'</script></head><h1>x</h1>';
  const r = inspectHtml(html, '/howtobuy/', routes);
  assert.equal(r.routeEvidence, 'match');
  assert.equal(r.identifiers.length, 1);
  assert.ok(!codes(r).includes('noindex'));
});

test('off-domain canonical/og:url with the requested path is not a route match', () => {
  const r = inspectHtml('<link rel="canonical" href="https://other.example/howtobuy/"><h1>x</h1>', '/howtobuy/', routes);
  assert.equal(r.routeEvidence, 'mismatch');
  const ok = inspectHtml('<link rel="canonical" href="/howtobuy/"><meta property="og:url" content="https://www.bonafidenitro.com/howtobuy/"><h1>x</h1>', '/howtobuy/', routes);
  assert.equal(ok.routeEvidence, 'match');
});

test('an unterminated script is counted and flagged', () => {
  const r = inspectHtml('<h1>x</h1><p>a</p><script>never_closed()', '/howtobuy/', routes);
  assert.equal(r.scriptCount, 1);
  assert.ok(codes(r).includes('scripts-present'));
  assert.ok(!JSON.stringify(r).includes('never_closed'));
});

test('unterminated comments cannot supply canonical, title or visible page text', () => {
  const r = inspectHtml('<h1>Real</h1><!-- <link rel="canonical" href="https://bonafidenitro.com/howtobuy/"><h1>Fake</h1><p>bad comment</p>', '/howtobuy/', routes);
  assert.equal(r.routeEvidence, 'none');
  assert.ok(!JSON.stringify(r).includes('bad comment'));
  assert.deepEqual(r.h1, ['Real']);
});

test('out-of-range numeric entities are safely replaced rather than crashing intake', () => {
  const r = inspectHtml('<h1>ok &#99999999; &#x110000;</h1><p>safe</p>', '/howtobuy/', routes);
  assert.equal(r.textSnippets[0], 'safe');
  assert.equal(r.routeEvidence, 'none');
});

test('an existing output is never overwritten, including potential hard links', () => {
  const html = write('no-overwrite.html', SAMPLE);
  const target = write('existing-report.json', 'PRESERVE-THIS-BYTES');
  assert.throws(() => run(['--route', '/howtobuy/', '--html', html, '--output', target]), /refusing to overwrite/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'PRESERVE-THIS-BYTES');
  const linked = path.join(tmp, 'existing-hardlink.json');
  fs.linkSync(target, linked);
  assert.throws(() => run(['--route', '/howtobuy/', '--html', html, '--output', linked]), /refusing to overwrite/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'PRESERVE-THIS-BYTES');
});
