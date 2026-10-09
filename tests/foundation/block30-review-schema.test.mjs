// Block 30 (Issue #78): I7/D7 decision. Repository evidence does not prove the historical homepage
// Review snippet was legitimate third-party data, so no Review/AggregateRating schema is emitted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

t('built homepage has no Review/AggregateRating/Rating schema', () => {
  const html = fs.readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(html, /"@type"\s*:\s*"(Review|AggregateRating|Rating)"/);
  assert.doesNotMatch(html, /"(aggregateRating|reviewRating|ratingValue|reviewCount|ratingCount)"/);
});

t('no built page emits review/rating schema', () => {
  for (const f of walk('dist').filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(html, /"@type"\s*:\s*"(Review|AggregateRating|Rating)"/, f);
    assert.doesNotMatch(html, /"(aggregateRating|reviewRating|ratingValue|reviewCount)"/, f);
  }
});

t('homepage keeps title, H1 and canonical unchanged', () => {
  const html = fs.readFileSync('dist/index.html', 'utf8');
  assert.match(html, /<title>Nitro Coffee Experts &amp; Leaders - Bona Fide Nitro Coffee &amp; Nitro Tea<\/title>/);
  assert.match(html, /<h1>BONA FIDE - EXPERTS IN NITRO COFFEE AND NITRO TEA<\/h1>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/bonafidenitro\.com\/">/);
});
