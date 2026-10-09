// Block 30 (Issue #80): decision I7/D7 — no verified third-party review provenance, so no Review/AggregateRating JSON-LD in the built site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findReviewRatingTerms } from '../../qa/lib/jsonld.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const walk = (d) => fs.readdirSync(`dist${d}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}${e.name}/`) : e.name.endsWith('.html') ? [`${d}${e.name}`] : []));
const blocks = (file) => [...fs.readFileSync(`dist${file}`, 'utf8').matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));

t('no built page carries Review/AggregateRating/Rating JSON-LD (normalised comparison)', () => {
  const files = walk('/');
  assert.ok(files.length > 30);
  for (const f of files) for (const b of blocks(f)) assert.deepEqual(findReviewRatingTerms(b), [], f);
});

t('homepage title, H1 and canonical are preserved', () => {
  const html = fs.readFileSync('dist/index.html', 'utf8');
  assert.match(html, /<title>Nitro Coffee Experts &amp; Leaders - Bona Fide Nitro Coffee &amp; Nitro Tea<\/title>/);
  assert.match(html, /<h1>BONA FIDE - EXPERTS IN NITRO COFFEE AND NITRO TEA<\/h1>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/bonafidenitro\.com\/"/);
});

test('source: homepage still declares no Review markup of its own', () => {
  const src = fs.readFileSync('src/pages/index.astro', 'utf8');
  assert.ok(!/AggregateRating|"Review"|reviewRating/.test(src));
});
