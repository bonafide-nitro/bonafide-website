// Block 33 (Issue #84): the 16 recovered original T7 assets are preserved byte-for-byte at their exact, case-sensitive paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// [URL path, size, SHA-256] of the owner-supplied originals (Issue #84 verified T7 bundle).
const ASSETS = [
  ['/wp-content/uploads/2022/05/Caveman-Coffee-Comapany-Nitro-by-Bona-Fide.png', 55258, 'e672c3254acd45b89148d8d0e651884718b244aaeb2daa00aaa81b408853ba9c'],
  ['/wp-content/uploads/2022/05/ourGorongosa-Coffee-Nitro-by-Bona-Fide.png', 62147, '0d8f4e2d27f1f417d89a2fbe3040b48b8580ff0c8f2cf3328a7a5f187cd449c7'],
  ['/wp-content/uploads/2022/05/Jittery-Johns-Coffee-Comapany-Nitro-by-Bona-Fide.png', 59154, '47b2df5806aacd9d88b10e5ebe8945738c25358bde0033d8335f8639c2471e01'],
  ['/wp-content/uploads/2022/05/Thai-Treasures-Coffee-Nitro-by-Bona-Fide.png', 60333, '854d237f9a32be66ec330fc6c38da80c10a89cb8415ac08e405b0065779fb434'],
  ['/wp-content/uploads/2022/05/CULT-Coffee-Comapany-Nitro-by-Bona-Fide.png', 56079, '547f5fa0fa64779f5499e6c22e05fc2ca70269d040673253b4cbebab08bc1d08'],
  ['/wp-content/uploads/2022/05/Thanksgiving-Coffee-Company-Nitro-by-Bona-Fide.png', 56135, '29de647453ef43c074b5e53b92824bd1cf00c730f84ecea0d64e32b5af7d5213'],
  ['/wp-content/uploads/2021/10/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap.jpg', 145686, '9a6c00f4e9512a73109416daae014ee2b2c1553db87ac335d0176845bd664aa2'],
  ['/wp-content/uploads/2018/06/Bona-Fide-Cold-Dispenser-countertop-small-min-1.png', 86246, '84d92129106de5d620926f94013b07f755a7fc0c4433d5af4cd38d64fec35198'],
  ['/wp-content/uploads/2018/06/All-about-nitro-cold-brew-coffee.jpg', 188946, '01474a0f78e81755cd1f6f3347ad65ca64c29061ff903a0dce348e98cd774970'],
  ['/wp-content/uploads/2017/10/Hair-Raiser-Nitro-Coffee-for-website.png', 57238, 'f354403674396b643ce2e396beff20246d88e5cd19211be801b73a7795f31465'],
  ['/wp-content/uploads/2018/06/Kegerator-counter-top-Bona-Fide.jpg', 212930, 'a837fd44d76ba484db9f3cb1bf8adefd2b96d80a53b2b9dac3c98541162f7876'],
  ['/wp-content/uploads/2023/03/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap-PET-Keg.jpg', 274186, 'd8d763e80436323d0cc55a6f88487b9e7453784f9dd599f397e2545ae7185436'],
  ['/wp-content/uploads/2023/03/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-1.jpg', 237416, '5e9054653036aefe2c523a0052d0750c9351bec5afe50aa1c6e5b81651e75f64'],
  ['/wp-content/uploads/2020/07/What-is-nitro-Coffee-Explained-simple-Bona-Fide.jpg', 100272, 'aa1458e18e54342f2e9de7ef4d49d4f45c43ef65ab4ebaa1876cc69acba2dc2d'],
  ['/wp-content/uploads/2023/03/Bona-Fide-Ai-Created-Image-.jpg', 57912, '89e0835a65eddfed0915b949b0f4f0df444336bc8dcadfe12e7fd150a6dbac10'],
  ['/wp-content/uploads/2018/06/Nitro-Coffeee-serving-from-tap-Bona-Fide.jpg', 130224, '2aabe36bbca9df39c9d979a89148dea42928c60254cd8e763da63785d53e40ea'],
];

const manifest = JSON.parse(fs.readFileSync('qa/t7-image-manifest.json', 'utf8'));
const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);

// Case-sensitive existence: readdir returns the on-disk spelling.
const exactCase = (root, urlPath) => fs.readdirSync(path.join(root, path.posix.dirname(urlPath))).includes(path.posix.basename(urlPath));

test('the pinned asset list is exactly the T7 manifest (16 paths, no extras)', () => {
  assert.deepEqual(ASSETS.map((a) => a[0]), manifest.images.map((i) => i.path));
  assert.equal(new Set(ASSETS.map((a) => a[0])).size, 16);
});

test('every asset exists under public/ at its exact case-sensitive path', () => {
  for (const [p] of ASSETS) assert.ok(exactCase('public', p), `${p} not found with exact case in public/`);
});

test('every asset is byte-identical to the owner-supplied original and has the right image signature', () => {
  for (const [p, size, sha] of ASSETS) {
    const buf = fs.readFileSync(path.join('public', p));
    assert.equal(buf.length, size, `${p} size`);
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), sha, `${p} sha256`);
    if (p.endsWith('.png')) assert.ok(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `${p} PNG signature`);
    else assert.deepEqual([...buf.subarray(0, 3)], [0xff, 0xd8, 0xff], `${p} JPEG signature`);
  }
});

test('only the 16 manifested originals were imported: no other new T7 files under public/wp-content/uploads', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const imgs = walk('public/wp-content/uploads').map((f) => '/' + path.relative('public', f).split(path.sep).join('/')).filter((f) => /\.(png|jpe?g)$/i.test(f));
  assert.deepEqual(imgs.sort(), ASSETS.map((a) => a[0]).sort());
});

t('every asset is in dist/ at its exact path and byte-identical to the source', () => {
  for (const [p] of ASSETS) {
    assert.ok(exactCase('dist', p), `${p} not found with exact case in dist/`);
    assert.ok(fs.readFileSync(path.join('dist', p)).equals(fs.readFileSync(path.join('public', p))), `${p} differs in dist/`);
  }
});

test('ranking-list completeness stays an explicit open finding (not cleared by importing the archive)', () => {
  assert.equal(manifest.rankingList.complete, false);
  assert.match(manifest.rankingList.evidenceGap, /~20/);
});
