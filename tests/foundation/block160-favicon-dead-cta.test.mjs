// Issue #160: shipped favicon linked from every page, and a known-dead commerce destination is never a clickable link.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCommerce } from '../../src/lib/data.mjs';
import { commerceIsKnownDead } from '../../src/lib/commerce.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

test('public/favicon.ico is a valid multi-size ICO of PNG images', () => {
  const b = fs.readFileSync('public/favicon.ico');
  assert.equal(b.readUInt16LE(0), 0);
  assert.equal(b.readUInt16LE(2), 1);
  const n = b.readUInt16LE(4);
  assert.ok(n >= 2);
  for (let i = 0; i < n; i++) {
    const len = b.readUInt32LE(6 + 16 * i + 8), off = b.readUInt32LE(6 + 16 * i + 12);
    assert.equal(b.subarray(off, off + 8).toString('hex'), '89504e470d0a1a0a', `image ${i} is PNG`);
    assert.ok(off + len <= b.length);
  }
});

t('favicon.ico ships in dist and every HTML page links it', () => {
  assert.ok(fs.existsSync('dist/favicon.ico'));
  for (const f of walk('dist').filter((p) => p.endsWith('.html'))) {
    assert.ok(/<link rel="icon" href="\/favicon\.ico"/.test(fs.readFileSync(f, 'utf8')), f);
  }
});

test('starter-kit destination is recorded as known dead; working links are not', () => {
  assert.equal(commerceIsKnownDead('equipment-starter-kit'), true);
  for (const id of ['equipment-double-faucet', 'equipment-hot-nitro', 'webstore-root-www']) assert.equal(commerceIsKnownDead(id), false, id);
  assert.throws(() => commerceIsKnownDead('nope'));
});

t('no built page links any knownDead commerce href', () => {
  const dead = Object.values(loadCommerce().links).filter((l) => l.knownDead).map((l) => l.href);
  assert.ok(dead.length >= 1);
  for (const f of walk('dist').filter((p) => p.endsWith('.html'))) {
    const html = fs.readFileSync(f, 'utf8');
    for (const h of dead) assert.ok(!html.includes(`href="${h}"`), `${f} links ${h}`);
  }
});

t('/kegerators/ keeps the starter-kit section with a non-clickable label and a contact link; working CTAs remain', () => {
  const h = fs.readFileSync('dist/kegerators/index.html', 'utf8');
  assert.ok(/<span class="cta cta-label">Countertop flash chiller starter kit<\/span>/.test(h));
  assert.ok(h.includes('href="/contact-bona-fide-nitro-coffee-and-tea/"'));
  assert.ok(h.includes('double-faucet-countertop-flash-chiller-w-compressor"'));
  assert.ok(h.includes('selbach-hot-nitro-dispenser-w-2-faucets"'));
  assert.ok(h.includes('<h2>Countertop cold nitro dispenser</h2>'));
});
