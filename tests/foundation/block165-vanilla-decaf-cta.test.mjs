// Issue #165: retail Organic Vanilla store link and special-request Decaf contact CTA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCommerce, loadProducts } from '../../src/lib/data.mjs';

const VANILLA = 'https://www.nitrocoffee.store/products/peoples-organic-nitro-vanilla-pet-5-gal';
const CONTACT = '/contact-bona-fide-nitro-coffee-and-tea/';
const built = fs.existsSync('dist/products/index.html');
const card = (file, name) => {
  const html = fs.readFileSync(file, 'utf8');
  const i = html.indexOf(`<h3>${name}</h3>`);
  assert.ok(i >= 0, name);
  return html.slice(i, html.indexOf('</li>', i));
};

test('decaf-mexico is special request with no store href; stale retail-vanilla marker removed', () => {
  const d = loadProducts().find((p) => p.id === 'decaf-mexico');
  assert.equal(d.specialRequest, true);
  assert.equal(d.links, undefined);
  assert.ok(!loadCommerce().unresolved.some((u) => u.id === 'products-retail-vanilla-store'));
  assert.ok(loadCommerce().unresolved.some((u) => u.id === 'products-decaf-mexico-store'));
});

test('built pages: vanilla links to the exact store href on both views; decaf offers contact, not Buy', { skip: !built }, () => {
  for (const f of ['dist/products/index.html', 'dist/products-2/index.html']) {
    assert.ok(card(f, 'Organic Nitro Vanilla Coffee').includes(`href="${VANILLA}"`), f);
    const decaf = card(f, 'Decaf Mexico');
    assert.ok(decaf.includes(`href="${CONTACT}"`), f);
    assert.ok(decaf.includes('Contact / Request availability'), f);
    assert.ok(!/nitrocoffee\.store|Buy on|amazon/i.test(decaf), f);
  }
});
