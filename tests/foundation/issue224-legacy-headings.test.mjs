// Issue #224 / PR #225: body headings on these routes keep the original WordPress (WXR) wording order
// AND tag level, including multiple legacy H1s. Checked against the built dist/ (run `npm run build` first).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LEGACY_H1_COUNT } from '../../qa/legacy-h1.mjs';
import { auditHtml } from '../../qa/lib/a11y.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const evidence = JSON.parse(fs.readFileSync('docs/migration/data/block63-wxr-evidence.json', 'utf8'));
const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&#38;|&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&#34;|&quot;/g, '"');
const norm = (s) => decode(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, '').toLowerCase();
const wxr = (slug) => evidence.entries.find((e) => e.slug === slug).blocks.filter((b) => b.t === 'h').map((b) => [b.l, norm(b.html)]);
const built_ = (p) => {
  const h = fs.readFileSync(`dist${p}index.html`, 'utf8').replace(/<header id="masthead"[\s\S]*?<\/header>/, '');
  const main = h.slice(h.indexOf('<main'), h.indexOf('</main>'));
  return [...main.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => [Number(m[1]), norm(m[2])]);
};

t('/nitro-cold-brew/: every WXR heading is rendered in order at its exact WXR level (16 H1, 6 H2, 6 H3)', () => {
  const want = wxr('nitro-cold-brew');
  assert.deepEqual(want.reduce((a, [l]) => ({ ...a, [l]: (a[l] ?? 0) + 1 }), {}), { 1: 16, 2: 6, 3: 6 });
  const got = built_('/nitro-cold-brew/').filter(([, txt]) => want.some(([, w]) => w === txt));
  assert.deepEqual(got, want);
});

t('/nitro-cold-brew-coffee-made-easy-2/: the 14 WXR H1 headings stay H1, in order, after the page-title H1', () => {
  const want = wxr('nitro-cold-brew-coffee-made-easy-2');
  assert.equal(want.length, 14);
  assert.ok(want.every(([l]) => l === 1));
  const got = built_('/nitro-cold-brew-coffee-made-easy-2/');
  assert.deepEqual(got[0], [1, norm('Simple Explain Nitro Cold Brew Coffee')]);
  assert.deepEqual(got.filter(([, txt]) => want.some(([, w]) => w === txt)), want);
});

test('pinned legacy H1 counts are exact expectations, not waivers', () => {
  assert.deepEqual(Object.keys(LEGACY_H1_COUNT).sort(), ['/nitro-cold-brew-coffee-made-easy-2/', '/nitro-cold-brew/']);
  const doc = (body) => `<!doctype html><html lang="en"><head><title>x</title></head><body><main>${body}</main></body></html>`;
  const codes = (b, n) => auditHtml(doc(b), { expectedH1: n }).map((f) => f.code);
  assert.ok(!codes('<h1>A</h1><h1>B</h1>', 2).includes('h1-count'));
  assert.ok(codes('<h1>A</h1>', 2).includes('h1-count'));
  assert.ok(codes('<h1>A</h1><h1>B</h1><h1>C</h1>', 2).includes('h1-count'));
  assert.ok(codes('<h1>A</h1><h1>B</h1>').includes('h1-count'), 'default stays exactly one');
});
