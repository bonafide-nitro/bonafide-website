// Block 41 (Issue #100): the original sitewide header logo is byte-verified and rendered exactly once, in the shared header, on every page.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const URL_PATH = '/wp-content/uploads/2019/04/Bona-Fide-logo-White-color-big-tea-for-website-header-1.png';
const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const pages = (dir = 'dist') => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? pages(p) : e.name.endsWith('.html') ? [p] : [];
});

test('logo binary: exact case-sensitive path, size, SHA-256, PNG signature and 250x108 dimensions', () => {
  assert.ok(fs.readdirSync(path.join('public', path.posix.dirname(URL_PATH))).includes(path.posix.basename(URL_PATH)), 'exact case');
  const buf = fs.readFileSync(path.join('public', URL_PATH));
  assert.equal(buf.length, 6562);
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), '34236a4f6dfab06c38b5bca077b928093b06e0c22d32b70e46a59dff76491dc0');
  assert.ok(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
  assert.equal(buf.readUInt32BE(16), 250);
  assert.equal(buf.readUInt32BE(20), 108);
});

t('every built page has exactly one header logo, inside <header id="masthead">, before the main nav, linking to / with the original alt', () => {
  const all = pages();
  assert.ok(all.length > 0);
  for (const f of all) {
    const h = fs.readFileSync(f, 'utf8');
    if (!h.includes('<body')) continue; // redirect stubs / non-document output
    const imgs = h.match(/<img\b[^>]*Bona-Fide-logo-White-color-big-tea-for-website-header-1\.png[^>]*>/g) || [];
    assert.equal(imgs.length, 1, `${f}: logo count`);
    const header = h.match(/<header id="masthead"[^>]*>([\s\S]*?)<\/header>/);
    assert.ok(header, `${f}: header`);
    assert.ok(header[1].includes(imgs[0]), `${f}: logo inside header`);
    assert.ok(header[1].indexOf(imgs[0]) < header[1].indexOf('<nav'), `${f}: logo precedes nav`);
    assert.match(header[1], /<a href="\/" title="Bona Fide Nitro Coffee"[^>]*><img /, `${f}: link to /`);
    assert.match(imgs[0], /src="\/wp-content\/uploads\/2019\/04\/Bona-Fide-logo-White-color-big-tea-for-website-header-1\.png"/);
    assert.match(imgs[0], /alt="Bona Fide Nitro Coffee"/);
    assert.match(imgs[0], /class="site-logo"/);
    assert.match(imgs[0], /width="250"/);
    assert.match(imgs[0], /height="108"/);
  }
});

t('the logo src resolves to a built file (no broken image)', () => {
  assert.ok(fs.existsSync(path.join('dist', URL_PATH)));
});
