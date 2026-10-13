// Block 39 (Issue #95): original product-page images are imported byte-for-byte and rendered with their exact observed alt.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadProducts } from '../../src/lib/data.mjs';
import { ASSETS } from './block39-assets.mjs';


// Block 40 page-level originals (banners, bullets, equipment, serving, Classic Blend, Amazon banner).
const PAGE_LEVEL = /Banner-Product-Page|Gold-Three-Kegs|Serving-Nitro|Classic-Blend|Keg-BIK|Available-On-Amazon|Hot-Tap|doble-tap/;
const built = fs.existsSync('dist/products/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const exactCase = (root, urlPath) => fs.readdirSync(path.join(root, path.posix.dirname(urlPath))).includes(path.posix.basename(urlPath));
const imgs = (f) => [...fs.readFileSync(f, 'utf8').matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((i) => i.includes('/wp-content/uploads/') && !i.includes('class="site-logo"')); // Block 41: sitewide header logo is not a product image
// The minified build writes an empty alt as a bare `alt` attribute.
const alt = (tag) => (/\balt(?=[\s>])/.test(tag) ? '' : tag.match(/\balt="([^"]*)"/)?.[1]);
const src = (tag) => tag.match(/\bsrc="([^"]*)"/)?.[1];

test('imported originals: exact case-sensitive path, size, SHA-256 and image signature', () => {
  for (const [p, size, sha] of ASSETS) {
    assert.ok(exactCase('public', p), `${p} exact case`);
    const buf = fs.readFileSync(path.join('public', p));
    assert.equal(buf.length, size, `${p} size`);
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), sha, `${p} sha256`);
    if (p.endsWith('.png')) assert.ok(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `${p} PNG signature`);
    else assert.deepEqual([...buf.subarray(0, 3)], [0xff, 0xd8, 0xff], `${p} JPEG signature`);
  }
});

test('every product records an original alt (possibly empty) and its image binary exists', () => {
  for (const p of loadProducts()) {
    assert.equal(typeof p.alt, 'string', `${p.id} alt`);
    for (const f of [p.image, ...Object.values(p.viewOverrides ?? {}).map((o) => o.image)].filter(Boolean)) assert.ok(fs.existsSync(`public${f}`), `${p.id} ${f}`);
  }
});

// Original alt observed per page (ASSET_MANIFEST.json references). '' is the genuine empty alt.
const ALT = {
  products: { 'Hair-Raiser': 'Hair Raiser Nitro Coffee by Bona Fide', 'Esspreso': 'Esspreso-Nitro-Coffee-by Bona Fide', 'Ethiopia': 'Nitro Coffee Ethiopia image for website', 'Vanilla': 'Vanilla-Nitro-by-Bona-Fide', 'Hazelnut': '', 'Peru': '', 'Guatemala': '', 'Decaf-Mexico': '', 'Hibiscuis': '', 'Mango': '', 'Pasion': '', 'Caramel': '' },
  'products-2': { 'Hair-Raiser': 'Hair Raiser Nitro Coffee by Bona Fide', 'Esspreso': 'Esspreso-Nitro-Coffee-by Bona Fide', 'Ethiopia': 'Nitro Coffee Ethiopia image for website', 'Vanilla': 'Vanilla-Nitro-by-Bona-Fide', 'Hazelnut': 'Bona-Fide-Nitro-Coffee-And-Tea-hazelnut-creme', 'Peru': '', 'Guatemala': '', 'Decaf-Mexico': '', 'Hibiscuis': '', 'Mango': '', 'Pasion': '', 'Caramel': '', 'Caveman': '', 'ourGorongosa': '', 'Jittery': '', 'Thai-Treasures': '', 'CULT': '', 'Thanksgiving': '' },
};

for (const page of ['products', 'products-2']) {
  t(`/${page}/ renders each product image with its original alt, and only those`, () => {
    // Block 40 page-level images and Amazon banners are asserted in block40-page-media.test.mjs.
    const found = imgs(`dist/${page}/index.html`).filter((i) => !PAGE_LEVEL.test(src(i)));
    const expected = loadProducts().filter((p) => p.views.includes(page === 'products' ? 'retail' : 'wholesale')).length;
    assert.equal(found.length, expected, found.join('\n'));
    const keys = Object.keys(ALT[page]);
    for (const k of keys) {
      const hits = found.filter((i) => src(i).includes(k));
      assert.ok(hits.length >= 1, `${page} missing ${k}`);
      for (const h of hits) assert.equal(alt(h), ALT[page][k], `${page} ${k} alt`);
    }
  });
  t(`/${page}/ references no missing upload`, () => {
    const html = fs.readFileSync(`dist/${page}/index.html`, 'utf8');
    for (const m of html.matchAll(/(?:src|href)="(\/wp-content\/uploads\/[^"]+)"/g)) {
      assert.ok(exactCase('public', m[1]), `public missing ${m[1]}`);
      assert.ok(fs.existsSync(`dist${m[1]}`), `dist missing ${m[1]}`);
    }
  });
}

t('/products/ uses the original 2022/05 Passion Fruit upload; /products-2/ the 2026/07 one', () => {
  assert.ok(imgs('dist/products/index.html').some((i) => src(i) === '/wp-content/uploads/2022/05/Pasion-Fruit-Nitro-tea-for-website-new.png'));
  assert.ok(imgs('dist/products-2/index.html').some((i) => src(i) === '/wp-content/uploads/2026/07/Pasion-Fruit-Nitro-tea-for-website-new.png'));
});
