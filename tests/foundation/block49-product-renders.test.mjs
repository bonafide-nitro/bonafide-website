// Product renders and owner-supplied photography in public/images/product-renders/.
// Block 49 (Issue #114) stored the first renders repo-only. Žaneta uploaded further
// photography on 2026-11-11 (commits 37de254, e4aa34c) and PR #208 places a subset
// on /howtobuy/, so the "not placed" assertion is replaced by "every placed render exists".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'public/images/product-renders';
// Block 49 cap; the owner-supplied 1536x1024 photographs are allowed a slightly larger cap.
const MAX_BYTES = 250 * 1024;
const MAX_PHOTO_BYTES = 320 * 1024;
const PHOTOS_OVER_RENDER_CAP = new Set(['bona-fide-keg-lineup-walk-in-cooler.webp']);
const FILES = {
  'bona-fide-black-keg-storage.webp': [142824, '51e68e9ac71181e028e7e4e07416744fd9a63bdd582a1a8abe4593c2cddce267'],
  'bona-fide-classic-blend-bag-in-box-3l.webp': [25370, '1b64090c5e3d73fd0bcf420afd876ae8936f304374c9ad479bd50b730bb27370'],
  'bona-fide-classic-blend-box-with-cups.png': [228910, 'd192ec76708a8ce45fc0e670b6934c29705606be811ac8b7bcb5e37600fbb41b'],
  'bona-fide-classic-blend-box-with-cups.webp': [80460, 'b65dce4efacb3b99f6c2c22592eb3d36fcca003d3444135e2b241a631bfd7afe'],
  'bona-fide-classic-blend-box.png': [215134, 'b25c5d486f7a6859a0a1ee304a63793f8e935326063d23b52b28440e87daf8f5'],
  'bona-fide-classic-blend-box.webp': [58656, '25622a766edec1f89e2e8494fd2e78155d6adc0aeb697833036d1def782cfc84'],
  'bona-fide-classic-blend-office-breakroom.webp': [170080, '35c419376418c1b52540e91b067ac530475497f22bd62a4acb563232ce45a845'],
  'bona-fide-iced-coffee-sunny-cafe.webp': [131004, '6d1bc03ec599a7166d907594d52f272bdc2c3195fff26156d154877f85682a9a'],
  'bona-fide-iced-coffee-with-cream.png': [139805, '4762e198765814df038d7e891ac564f45c9369b369e243511960320cb3b75864'],
  'bona-fide-iced-coffee-with-cream.webp': [19640, 'b9fa233c8dee8a5b93916293b324b11c77b8d539648def1d525a97ba52227171'],
  'bona-fide-keg-lineup-walk-in-cooler.webp': [309078, 'f42daaba41d7733f4e23731d4ed5a79afbc75ee5cfcdab99397a09005c796b52'],
  'bona-fide-keg-lineup-warehouse.webp': [201776, '43866ed8b01d10c0bb3315ba2fc2c785f8bf5d43208c1c7d395806beac0c650b'],
  'bona-fide-nitro-coffee-keg-lineup-front-view.webp': [34266, 'cff27544f9b238f09e3ffa4f369eb9266b74fdc4aab0ca87f45151ecf975b3e6'],
  'bona-fide-nitro-coffee-keg-lineup-top-view.webp': [34908, 'c601b044891336b38320771044f41b140d4e5fb25aa08a89b8a688bbab5c6700'],
  'bona-fide-nitro-coffee-keg.png': [86285, 'ff278441e70dc8fc9521743a6342ebb306117c07f0143ef937cf4fbe79ae1858'],
  'bona-fide-nitro-coffee-keg.webp': [26340, 'c5edf15148b0e0d61c172e575c1f0b015f2c60dea5a4c879040a6193331782a7'],
  'bona-fide-nitro-coffee-pint-with-coffee-beans.webp': [17826, 'c37941e13cdd304c3e0a7a5b4e3b1949d4b63f2d809d2a7ea23e878823e704e4'],
  'bona-fide-nitro-coffee-single-and-double-tap-kegerators.webp': [27254, 'c13d9877d2b89bf6ba312180b9353b28a2ac020a8d411d9bd07b1b16943cdc36'],
  'bona-fide-nitro-coffee-single-tap-kegerator.webp': [19688, '2a9bfe01b189c2f8497e22813e6db46360bf068186b85de6318b86d7bcb2d4c2'],
  'bona-fide-nitro-coffee-tea-black-keg.webp': [16322, '3ed817e707f9cb42e15cf97c8a631ecd4c850a0a696760f702fbfd5c0a44aa76'],
  'bona-fide-nitro-coffee-tea-stainless-keg.webp': [15358, '49c271c8db7f74a7ebb40cee068d30f74612d8e87861f3e9e8e8c890e8b13796'],
  'bona-fide-nitro-cold-brew-pint.webp': [11640, '4d3a43b53d5a232e8f6f60a2fd9ae61be2f3f5830fab2abe558c748191fbc3dc'],
  'bona-fide-nitro-pint-cozy-cafe.webp': [159028, '4264f0d93085748eac345c336caf8153a93c5be20841b4f57dc737826e9b928b'],
  'bona-fide-nitro-pint-walnut-bar.webp': [110978, '4f61b2eefe6ff2143bf9c2c669fcdc20a604fdb33f0ec6a82e0e1222594f9f42'],
  'bona-fide-single-double-tap-office.webp': [162036, '67866fa5c9f102550ca27e428ccad03b7ac555d07c1f04808ef95e1533a6d41b'],
  'bona-fide-single-tap-coffee-shop.webp': [142776, '4749654c0e791b2a8dc850c296321836b193ad9a2dfb51fb4f6aa6ea49c4ae2a'],
  'bona-fide-stainless-keg-industrial-cafe.webp': [129798, '323eca1695b211ae1a10531ede9506ce4293fda674e5a2e4f91a1cae9c0fb2fc'],
};

test('render directory contains exactly the pinned files', () => {
  assert.deepEqual(fs.readdirSync(DIR).sort(), Object.keys(FILES).sort());
});

for (const [name, [size, sha]] of Object.entries(FILES)) {
  test(`${name} matches pinned size, hash, signature and size cap`, () => {
    const buf = fs.readFileSync(`${DIR}/${name}`);
    assert.equal(buf.length, size);
    assert.ok(buf.length <= (PHOTOS_OVER_RENDER_CAP.has(name) ? MAX_PHOTO_BYTES : MAX_BYTES), 'over web size cap');
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), sha);
    if (name.endsWith('.png')) assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    else assert.ok(buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP');
  });
}

test('every render referenced from page source exists in the render directory', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  const refs = walk('src').flatMap((f) =>
    [...fs.readFileSync(f, 'utf8').matchAll(/\/images\/product-renders\/([A-Za-z0-9._-]+)/g)].map((m) => [f, m[1]]));
  const missing = refs.filter(([, name]) => !Object.hasOwn(FILES, name));
  assert.deepEqual(missing, []);
});

test('renders are placed only on /howtobuy/ (PR #208); other pages unchanged', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  const hits = walk('src').filter((f) => fs.readFileSync(f, 'utf8').includes('product-renders'));
  assert.deepEqual(hits, ['src/pages/howtobuy/index.astro']);
});
