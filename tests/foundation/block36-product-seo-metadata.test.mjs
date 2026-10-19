// Block 36 (Issue #90): exact original WordPress title + meta description on the two distinct product pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
// The two original pages (WP 147 and 7801) share this title and description intentionally.
const TITLE = 'Cold Brew Nitro Coffee Kegs - Bona Fide Nitro Coffee and Tea';
const DESC = 'Nitro cold brew coffee kegs on tap are becoming a necessity for coffee shops. We have them in stock. Ready to be delivered to your office, restaurant, coffee shop, or cafe. Buy our nitro coffee kegs online today.';
const html = (p) => fs.readFileSync(`dist${p}index.html`, 'utf8');
const all = (h, re) => [...h.matchAll(re)];

for (const path of ['/products/', '/products-2/']) {
  t(`${path}: exact title, exactly one exact meta description`, () => {
    const h = html(path);
    assert.deepEqual(all(h, /<title>([^<]*)<\/title>/g).map((m) => m[1]), [TITLE]);
    const d = all(h, /<meta name="description" content="([^"]*)"/g).map((m) => m[1]);
    assert.deepEqual(d, [DESC]);
    assert.equal(all(h, /<meta[^>]+name="description"/g).length, 1);
  });

  t(`${path}: own single canonical, no cross-canonical, not noindex`, () => {
    const h = html(path);
    assert.deepEqual(all(h, /<link rel="canonical" href="([^"]+)"/g).map((m) => m[1]), [`https://bonafidenitro.com${path}`]);
    // Only a noindex directive is rejected; a later Block may restore the evidenced `index, follow, ...` robots tag.
    for (const m of all(h, /<meta[^>]+name="robots"[^>]*>/g)) assert.ok(!/noindex/i.test(m[0]), m[0]);
  });

  t(`${path}: no unverified og:image / image reference was invented`, () => {
    const h = html(path);
    assert.ok(!/og:image/.test(h));
    // Block 40 renders the banner as a page <img>; it must still never be used as a meta/link image reference.
    assert.ok(!/<(?:meta|link)\b[^>]*Bona-Fide-Banner-Product-Page-1/.test(h));
    for (const m of all(h, /<img\b[^>]*\ssrc="([^"]+)"/g)) assert.ok(fs.existsSync(`dist${m[1]}`), `${m[1]} must exist in dist`);
  });
}

t('other pages gain no meta description from this Block', () => {
  if (fs.existsSync('dist/index.html')) assert.ok(!/name="description"/.test(html('/')));
  // Block 63: /howtobuy/ may carry a description only when it is exactly the _aioseop_description value in the 2026-10-19 WordPress export.
  const howtobuy = JSON.parse(fs.readFileSync('docs/migration/data/block63-wxr-evidence.json', 'utf8')).entries.find((e) => e.slug === 'howtobuy').seoDescription;
  const d = all(html('/howtobuy/'), /<meta name="description" content="([^"]*)"/g).map((m) => m[1].replace(/&amp;/g, '&'));
  assert.deepEqual(d, howtobuy ? [howtobuy] : []);
});
