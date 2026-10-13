// Block 40 (Issue #97): page-level artwork of the original /products/ and /products-2/ pages, placed per the owner-saved HTML.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PAGE_ASSETS } from './block40-assets.mjs';
import { MEDIA } from '../../src/lib/page-media.mjs';

const built = fs.existsSync('dist/products/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const exactCase = (urlPath) => fs.readdirSync(path.join('public', path.posix.dirname(urlPath))).includes(path.posix.basename(urlPath));
const html = (page) => fs.readFileSync(`dist/${page}/index.html`, 'utf8');
const imgTags = (h) => [...h.matchAll(/<img\b[^>]*>/g)].map((m) => ({ tag: m[0], at: m.index }));
const src = (tag) => tag.match(/\bsrc="([^"]*)"/)?.[1];
// The minified build writes an empty alt as a bare `alt` attribute.
const alt = (tag) => (/\balt(?=[\s>])/.test(tag) ? '' : tag.match(/\balt="([^"]*)"/)?.[1]);
const firstAt = (h, s) => { const i = h.indexOf(s); assert.ok(i >= 0, `missing ${s}`); return i; };
const find = (h, m) => { const x = imgTags(h).find((i) => src(i.tag) === m.src); assert.ok(x, `missing ${m.src}`); return x; };

test('imported page-level originals: exact case-sensitive path, size, SHA-256 and signature', () => {
  assert.equal(PAGE_ASSETS.length, 11);
  for (const [p, size, sha] of PAGE_ASSETS) {
    assert.ok(p.startsWith('/wp-content/uploads/') && !p.includes('..'), p);
    assert.ok(exactCase(p), `${p} exact case`);
    const buf = fs.readFileSync(path.join('public', p));
    assert.equal(buf.length, size, `${p} size`);
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), sha, `${p} sha256`);
    if (p.endsWith('.png')) assert.ok(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `${p} PNG`);
    else assert.deepEqual([...buf.subarray(0, 3)], [0xff, 0xd8, 0xff], `${p} JPEG`);
  }
});

test('page-media mapping: every entry is an imported/present original with its evidenced alt', () => {
  const pinned = new Set(PAGE_ASSETS.map((a) => a[0]));
  const ALT = {
    logo: 'Bona Fide Nitro Coffee', banner: 'Bona-Fide-Banner-Product-Page', bullets: 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets',
    bullets2: 'Banner-Product-Page-Bona-Fide-Product-Page-Bullets', goldKegs: 'Bona-Fide-Banner-New-Home-Page-Gold-Three-Kegs', serving: '', classicBlend: '',
    coldMachine: 'Bona-Fide-Cold-doble-tap-nitro-machine-coffee-and-tea', hotTap: 'NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed',
    kegBik: 'Bona Fide Nitro Coffee And Tea Keg BIK Set Hot Cold Machine New', amazon: 'Bona Fide Cold brew Nitro Coffee Available On Amazon',
  };
  assert.deepEqual(Object.keys(MEDIA).sort(), Object.keys(ALT).sort());
  for (const [k, m] of Object.entries(MEDIA)) {
    assert.ok(pinned.has(m.src), `${k} pinned`);
    assert.equal(m.alt, ALT[k], `${k} alt`);
  }
});

const PAGE_LEVEL = Object.values(MEDIA).map((m) => m.src);
const ALLOWED = (page) => (page === 'products'
  ? ['logo', 'banner', 'goldKegs', 'serving', 'classicBlend', 'coldMachine', 'hotTap', 'kegBik', 'amazon']
  : ['logo', 'banner', 'bullets', 'bullets2']).map((k) => MEDIA[k].src);

for (const page of ['products', 'products-2']) {
  t(`/${page}/ renders exactly the evidenced page-level images, with original alt and a present binary`, () => {
    const found = imgTags(html(page)).filter((i) => PAGE_LEVEL.includes(src(i.tag)));
    const allowed = ALLOWED(page);
    for (const f of found) {
      assert.ok(allowed.includes(src(f.tag)), `${page}: unevidenced ${src(f.tag)}`);
      const m = Object.values(MEDIA).find((x) => x.src === src(f.tag));
      assert.equal(alt(f.tag), m.alt, `${page} ${m.src} alt`);
      assert.ok(fs.existsSync(`dist${m.src}`), `dist ${m.src}`);
    }
    for (const a of allowed) assert.ok(found.some((f) => src(f.tag) === a), `${page} missing ${a}`);
  });
}

t('/products/ placement follows the original page order', () => {
  const h = html('products');
  const at = (m) => find(h, m).at;
  const h1 = firstAt(h, '<h1>');
  assert.ok(at(MEDIA.logo) < at(MEDIA.banner) && at(MEDIA.banner) < h1, 'logo, banner before h1');
  assert.ok(h1 < at(MEDIA.goldKegs) && at(MEDIA.goldKegs) < at(MEDIA.serving), 'gold kegs then serving after intro');
  assert.ok(at(MEDIA.serving) < firstAt(h, 'Our Cold Brew Nitro Coffee In Keg Products'));
  const bib = firstAt(h, '<h2>Bag In Box</h2>');
  assert.ok(at(MEDIA.classicBlend) < bib && bib - at(MEDIA.classicBlend) < 400, 'Classic Blend immediately precedes the Bag In Box heading');
  const equip = firstAt(h, 'Are You Looking For Dispensing Equipment?');
  const cta = firstAt(h, '<a class="cta" href="/kegerators/">');
  assert.ok(equip < at(MEDIA.coldMachine) && at(MEDIA.coldMachine) < at(MEDIA.hotTap) && at(MEDIA.hotTap) < cta, 'machines between heading and CTA');
  assert.ok(firstAt(h, 'Nitro coffee and tea for workplaces.') < at(MEDIA.kegBik) && at(MEDIA.kegBik) < firstAt(h, '<h2>Coffee Shop Supply</h2>'), 'Keg/BIK set in the office block');
});

t('/products-2/ placement follows the original page order (banner, then bullets images flanking the bullet list)', () => {
  const h = html('products-2');
  const at = (m) => find(h, m).at;
  assert.ok(at(MEDIA.logo) < at(MEDIA.banner));
  const ul = firstAt(h, '<li>180+ Day Shelf Stable</li>');
  const end = h.indexOf('</ul>', ul);
  assert.ok(at(MEDIA.banner) < at(MEDIA.bullets) && at(MEDIA.bullets) < ul && end < at(MEDIA.bullets2));
  assert.ok(at(MEDIA.bullets2) - end < 200);
});

t('/products/ shows the Amazon badge only inside the 13 mapped Amazon links; /products-2/ has none', () => {
  const h = html('products');
  const anchors = [...h.matchAll(/<a\b[^>]*href="(https:\/\/www\.amazon\.com\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.equal(anchors.length, 13);
  for (const a of anchors) assert.ok(a[2].includes(MEDIA.amazon.src) && a[2].includes('Buy Securely On Amazon.com'), a[1]);
  assert.equal(imgTags(h).filter((i) => src(i.tag) === MEDIA.amazon.src).length, 13);
  assert.ok(!html('products-2').includes(MEDIA.amazon.src));
});

t('scaffold marker, canonical metadata and distinct routes are untouched', () => {
  for (const page of ['products', 'products-2']) {
    const h = html(page);
    assert.ok(h.includes('bonafide-qa'), `${page} scaffold marker kept`);
    assert.ok(h.includes(`rel="canonical" href="https://bonafidenitro.com/${page}/"`) || h.includes(`href=https://bonafidenitro.com/${page}/`), `${page} canonical`);
  }
});

t('only the two product pages carry the header logo', () => {
  for (const f of ['index.html', 'kegerators/index.html', 'howtobuy/index.html']) assert.ok(!fs.readFileSync(`dist/${f}`, 'utf8').includes(MEDIA.logo.src), f);
});
