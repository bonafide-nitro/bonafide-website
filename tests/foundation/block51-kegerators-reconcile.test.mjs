// Block 51 (Issue #118): the three equipment PNGs exist and are Block 40-pinned; /kegerators/ must not falsely claim they are missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ASSETS } from './block40-assets.mjs';

const EQUIPMENT = [
  '/wp-content/uploads/2019/08/Bona-Fide-Cold-doble-tap-nitro-machine-compressed.png',
  '/wp-content/uploads/2019/05/NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed.png',
  '/wp-content/uploads/2022/10/Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png',
];
const FALSE_CLAIM = /no pinned binaries|binaries? (?:are |is )?(?:not supplied|missing)|lack(?:s)? binaries|equipment image binaries .*not supplied/i;

test('three equipment PNGs exist and match their Block 40 size + SHA-256 pins', () => {
  for (const u of EQUIPMENT) {
    const pin = ASSETS.find((a) => a[0] === u);
    assert.ok(pin, `${u} pinned by Block 40`);
    const buf = fs.readFileSync(`public${u}`);
    assert.equal(buf.length, pin[1], u);
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), pin[2], u);
  }
});

test('/kegerators/ scaffold and QA blocker do not claim the binaries are missing', () => {
  const src = fs.readFileSync('src/pages/kegerators/index.astro', 'utf8');
  const cfg = JSON.parse(fs.readFileSync('qa/qa.config.json', 'utf8'));
  const blocker = JSON.stringify(cfg, null, 1).match(/"\/kegerators\/": "((?:[^"\\]|\\.)*)"/)[1];
  assert.ok(!FALSE_CLAIM.test(src), 'scaffold comment');
  assert.ok(!FALSE_CLAIM.test(blocker), 'qa blocker');
  assert.ok(/pinned/.test(src) && /unverified/.test(src) && /doc 09/.test(src));
  assert.ok(/unverified|not evidenced/.test(blocker) && /pinned/.test(blocker));
  assert.ok(src.includes('scaffold'), 'scaffold kept');
  const doc = fs.readFileSync('docs/migration/45-block50-kegerators-imagery.md', 'utf8');
  assert.ok(/Block 51/.test(doc) && /Provenance matrix/.test(doc));
});

test('equipment PNGs are not rendered on /kegerators/ (placement unevidenced)', () => {
  const src = fs.readFileSync('src/pages/kegerators/index.astro', 'utf8');
  const body = src.replace(/<!--[\s\S]*?-->/g, '');
  for (const u of EQUIPMENT) assert.ok(!body.includes(u.split('/').pop()), u);
});
