// Block 40 (Issue #97): page-level originals are byte-verified and rendered at their evidenced positions with the exact observed alt.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ASSETS } from './block40-assets.mjs';
import { PAGE_MEDIA } from '../../src/lib/page-media.mjs';
import { loadProducts } from '../../src/lib/data.mjs';

const built = fs.existsSync('dist/products/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const html = (page) => fs.readFileSync(`dist/${page}/index.html`, 'utf8');
const exactCase = (urlPath) => fs.readdirSync(path.join('public', path.posix.dirname(urlPath))).includes(path.posix.basename(urlPath));
// Ordered stream of <h1>/<h2> text and page-level <img> tags (alt '' is the minified bare `alt`).
const alt = (tag) => (/\balt(?=[\s>])/.test(tag) ? '' : tag.match(/\balt="([^"]*)"/)?.[1]);
const stream = (page) => [...html(page).matchAll(/<h[12]\b[^>]*>(.*?)<\/h[12]>|<img\b[^>]*>/g)]
  .map((m) => (m[0].startsWith('<img') ? { img: m[0].match(/\bsrc="([^"]*)"/)[1].split('/').pop(), alt: alt(m[0]) } : { h: m[1].replace(/<[^>]+>/g, '') }));
const pageLevel = (page) => stream(page).filter((x) => x.img && (/Hot-Tap/.test(x.img) || !/-for-website|Nitro-by-Bona|Nitro-Tea|Nitro-Coffeemfor/.test(x.img)) && x.img !== 'Bona-Fide-Available-On-Amazon.jpg');

test('page-level originals: exact case-sensitive path, size, SHA-256 and image signature', () => {
  for (const [p, size, sha] of ASSETS) {
    assert.ok(!p.includes('..'), p);
    assert.ok(exactCase(p), `${p} exact case`);
    const buf = fs.readFileSync(path.join('public', p));
    assert.equal(buf.length, size, `${p} size`);
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), sha, `${p} sha256`);
    if (p.endsWith('.png')) assert.ok(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `${p} PNG signature`);
    else assert.deepEqual([...buf.subarray(0, 3)], [0xff, 0xd8, 0xff], `${p} JPEG signature`);
  }
});

test('page-media mapping: every record points at a pinned binary and keeps the observed alt', () => {
  const pinned = new Set(ASSETS.map((a) => a[0]));
  assert.deepEqual(new Set(Object.values(PAGE_MEDIA).map((m) => m.src)), pinned);
  const ALT = { banner: 'Bona-Fide-Banner-Product-Page', threeKegs: 'Bona-Fide-Banner-New-Home-Page-Gold-Three-Kegs', serving: '', classicBlend: '',
    coldMachine: 'Bona-Fide-Cold-doble-tap-nitro-machine-coffee-and-tea', hotTap: 'NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed',
    kegBikSet: 'Bona Fide Nitro Coffee And Tea Keg BIK Set Hot Cold Machine New', amazon: 'Bona Fide Cold brew Nitro Coffee Available On Amazon',
    bullets: 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets', bullets2: 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets' };
  for (const [k, v] of Object.entries(ALT)) assert.equal(PAGE_MEDIA[k].alt, v, k);
});

t('/products/ places the page-level images in the evidenced original order, with exact alt', () => {
  const got = pageLevel('products').map((x) => [x.img, x.alt]);
  assert.deepEqual(got, [
    ['Bona-Fide-Banner-Product-Page-1.jpg', 'Bona-Fide-Banner-Product-Page'],
    ['Bona-Fide-Banner-New-Home-Page-Gold-Three-Kegs.jpg', 'Bona-Fide-Banner-New-Home-Page-Gold-Three-Kegs'],
    ['Bona-Fide-Serving-Nitro-Coffee-Cold-Ok-Cutted.jpg', ''],
    ['Classic-Blend-Bag-In-Box-Coffee-Cold-Brew-Bona-Fide.jpg', ''],
    ['Bona-Fide-Cold-doble-tap-nitro-machine-compressed.png', 'Bona-Fide-Cold-doble-tap-nitro-machine-coffee-and-tea'],
    ['NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed.png', 'NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed'],
    ['Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png', 'Bona Fide Nitro Coffee And Tea Keg BIK Set Hot Cold Machine New'],
  ]);
});

t('/products/ section anchors: banner before the h1; equipment images under the equipment h2; BIK-set image before "Coffee Shop Supply"', () => {
  const s = stream('products');
  const at = (pred) => s.findIndex(pred);
  const img = (n) => at((x) => x.img === n);
  const h = (txt) => at((x) => x.h && x.h.includes(txt));
  assert.ok(img('Bona-Fide-Banner-Product-Page-1.jpg') < h('Best Nitro Cold Brew Coffee Kegs'));
  assert.ok(img('Classic-Blend-Bag-In-Box-Coffee-Cold-Brew-Bona-Fide.jpg') < h('Our Cold Brew Nitro Coffee In Keg Products'));
  assert.ok(h('Are You Looking For Dispensing Equipment') < img('Bona-Fide-Cold-doble-tap-nitro-machine-compressed.png'));
  assert.ok(img('NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed.png') < h('Specialty Flavors'));
  assert.ok(h('Coffee & Tea For Office') < img('Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png') && img('Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png') < h('Coffee Shop Supply'));
});

t('/products-2/ places banner before the h1 and the two Bullets images around the bullet list; nothing else page-level', () => {
  const got = pageLevel('products-2').map((x) => [x.img, x.alt]);
  assert.deepEqual(got, [
    ['Bona-Fide-Banner-Product-Page-1.jpg', 'Bona-Fide-Banner-Product-Page'],
    ['Banner-Product-Page-Bona-Fide-Product-Page-Bullets.jpg', 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets'],
    ['Banner-Product-Page-Bona-Fide-Product-Page-Bullets2.jpg', 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets'],
  ]);
  const s = stream('products-2');
  const idx = s.findIndex((x) => x.img === 'Bona-Fide-Banner-Product-Page-1.jpg');
  assert.ok(idx < s.findIndex((x) => x.h?.includes('Best Nitro Cold Brew Coffee Kegs')));
  const body = html('products-2');
  const ul = body.indexOf('<li>180+ Day Shelf Stable');
  assert.ok(body.indexOf('Product-Page-Bullets.jpg') < ul && ul < body.indexOf('Product-Page-Bullets2.jpg'));
  assert.ok(!/Available-On-Amazon|Hot-Tap|doble-tap|Keg-BIK|Gold-Three-Kegs|Serving-Nitro|Classic-Blend/.test(body));
});

t('the Amazon banner sits inside each of the 13 mapped Amazon links on /products/ (and nowhere on /products-2/)', () => {
  const mapped = loadProducts().flatMap((p) => Object.values(p.links?.amazon ?? {}));
  assert.equal(mapped.length, 13);
  const links = [...html('products').matchAll(/<a\b[^>]*href="(https:\/\/www\.amazon\.com\/[^"]*)"[^>]*>(.*?)<\/a>/g)];
  assert.deepEqual(links.map((m) => m[1]).sort(), [...mapped].sort());
  for (const m of links) {
    const imgs = m[2].match(/<img\b[^>]*>/g) ?? [];
    assert.equal(imgs.length, 1, m[1]);
    assert.equal(alt(imgs[0]), PAGE_MEDIA.amazon.alt);
    assert.ok(/Buy Securely On Amazon\.com/.test(m[2]), 'link text preserved');
  }
  assert.ok(!/amazon\.com/.test(html('products-2')));
});

t('page-level images are responsive and every upload reference resolves in dist', () => {
  for (const page of ['products', 'products-2']) {
    const h = html(page);
    assert.match(h, /\.page-media(?:\[data-astro-cid-[^\]]+\])?\s+img(?:\[data-astro-cid-[^\]]+\])?\s*\{\s*max-width:\s*100%;\s*height:\s*auto;?\s*\}/);
    for (const m of h.matchAll(/(?:src|href)="(\/wp-content\/uploads\/[^"]+)"/g)) assert.ok(fs.existsSync(`dist${m[1]}`), m[1]);
    for (const tag of h.match(/<img\b[^>]*>/g).filter((x) => Object.values(PAGE_MEDIA).some((m) => x.includes(m.src)))) assert.ok(/\bwidth="\d+"/.test(tag) && /\bheight="\d+"/.test(tag), tag);
  }
});

t('page-level images add no SEO metadata (no og:image) and keep scaffold + canonical', () => {
  for (const page of ['products', 'products-2']) {
    const h = html(page);
    assert.ok(!/og:image/.test(h));
    assert.match(h, /bonafide-qa" content="scaffold-placeholder"/);
    assert.match(h, new RegExp(`rel="canonical" href="https://bonafidenitro.com/${page}/"`));
  }
});
