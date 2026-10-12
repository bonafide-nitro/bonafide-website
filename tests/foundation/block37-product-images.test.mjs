// Block 37 (Issue #92): product images render only with a present binary and evidenced original alt text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProducts } from '../../src/lib/data.mjs';

const built = fs.existsSync('dist/products/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const HR = '/wp-content/uploads/2017/10/Hair-Raiser-Nitro-Coffee-for-website.png';
const imgs = (f) => [...fs.readFileSync(f, 'utf8').matchAll(/<img\b[^>]*>/g)].map((m) => m[0]).filter((i) => i.includes('/wp-content/uploads/'));
const eligible = () => loadProducts().filter((p) => p.image && p.alt && fs.existsSync(`public${p.image}`));

test('only Hair Raiser is eligible: binary present at the exact path and original alt recorded', () => {
  assert.deepEqual(eligible().map((p) => p.id), ['hair-raiser-organic']);
  const p = eligible()[0];
  assert.equal(p.image, HR);
  assert.equal(p.alt, 'Hair Raiser Nitro Coffee by Bona Fide');
});

for (const page of ['products', 'products-2']) {
  t(`/${page}/ renders exactly the Hair Raiser <img> with its original alt`, () => {
    const found = imgs(`dist/${page}/index.html`);
    assert.equal(found.length, 1, found.join('\n'));
    assert.match(found[0], /src="\/wp-content\/uploads\/2017\/10\/Hair-Raiser-Nitro-Coffee-for-website\.png"/);
    assert.match(found[0], /alt="Hair Raiser Nitro Coffee by Bona Fide"/);
  });
  t(`/${page}/ references no missing upload and the asset exists in public/ and dist/`, () => {
    const html = fs.readFileSync(`dist/${page}/index.html`, 'utf8');
    for (const m of html.matchAll(/(?:src|href)="(\/wp-content\/uploads\/[^"]+)"/g)) {
      assert.ok(fs.existsSync(`public${m[1]}`), `public missing ${m[1]}`);
      assert.ok(fs.existsSync(`dist${m[1]}`), `dist missing ${m[1]}`);
    }
  });
}

t('retail/wholesale separation and prices are unchanged', () => {
  const retail = fs.readFileSync('dist/products/index.html', 'utf8');
  const wholesale = fs.readFileSync('dist/products-2/index.html', 'utf8');
  assert.ok(wholesale.includes('$195.00'));
  assert.ok(!retail.includes('$195.00'));
});

t('card images are constrained to the card width (no overflow)', () => {
  for (const page of ['products', 'products-2']) {
    assert.match(fs.readFileSync(`dist/${page}/index.html`, 'utf8'), /\.card img\s*\{\s*max-width:\s*100%;\s*height:\s*auto;?\s*\}/);
  }
});
