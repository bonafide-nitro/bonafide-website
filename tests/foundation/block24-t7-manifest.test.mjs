// Block 24 (Issue #66): the T7 required-image manifest is deterministic, evidenced verbatim, and not silently shrunk.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync('qa/t7-image-manifest.json', 'utf8'));
const ALLIANCE = [
  'Caveman-Coffee-Comapany', 'ourGorongosa-Coffee', 'Jittery-Johns-Coffee-Comapany',
  'Thai-Treasures-Coffee', 'CULT-Coffee-Comapany', 'Thanksgiving-Coffee-Company',
].map((n) => `/wp-content/uploads/2022/05/${n}-Nitro-by-Bona-Fide.png`);
const RANKING = [
  '/wp-content/uploads/2021/10/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap.jpg',
  '/wp-content/uploads/2018/06/Bona-Fide-Cold-Dispenser-countertop-small-min-1.png',
  '/wp-content/uploads/2018/06/All-about-nitro-cold-brew-coffee.jpg',
  '/wp-content/uploads/2017/10/Hair-Raiser-Nitro-Coffee-for-website.png',
  '/wp-content/uploads/2018/06/Kegerator-counter-top-Bona-Fide.jpg',
  '/wp-content/uploads/2023/03/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap-PET-Keg.jpg',
  '/wp-content/uploads/2023/03/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-1.jpg',
];

test('manifest lists exactly the 6 alliance + 7 evidenced ranking images, no extras', () => {
  const by = (g) => manifest.images.filter((i) => i.group === g).map((i) => i.path);
  assert.deepEqual(by('alliance'), ALLIANCE);
  assert.deepEqual(by('ranking'), RANKING);
  assert.equal(manifest.images.length, 13);
  assert.equal(manifest.alliance.requiredCount, 6);
});

test('ranking list stays an explicit evidence gap (not declared complete)', () => {
  assert.equal(manifest.rankingList.complete, false);
  assert.match(manifest.rankingList.evidenceGap, /~20/);
});

test('every manifested path appears verbatim in preserved repository evidence', () => {
  const docs = fs.readdirSync('docs/migration').filter((f) => f.endsWith('.md')).map((f) => fs.readFileSync(path.join('docs/migration', f), 'utf8')).join('\n');
  for (const { path: p } of manifest.images) {
    const file = p.split('/').pop();
    assert.ok(docs.includes(file), `${file} not found in docs/migration evidence`);
  }
});
