// Block 49 (Issue #114): web-optimised product renders are stored repo-only (not placed on any page).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'public/images/product-renders';
const MAX_BYTES = 250 * 1024;
const FILES = {
  'bona-fide-classic-blend-box-with-cups.png': [228910, 'd192ec76708a8ce45fc0e670b6934c29705606be811ac8b7bcb5e37600fbb41b'],
  'bona-fide-classic-blend-box-with-cups.webp': [80460, 'b65dce4efacb3b99f6c2c22592eb3d36fcca003d3444135e2b241a631bfd7afe'],
  'bona-fide-classic-blend-box.png': [215134, 'b25c5d486f7a6859a0a1ee304a63793f8e935326063d23b52b28440e87daf8f5'],
  'bona-fide-classic-blend-box.webp': [58656, '25622a766edec1f89e2e8494fd2e78155d6adc0aeb697833036d1def782cfc84'],
  'bona-fide-iced-coffee-with-cream.png': [139805, '4762e198765814df038d7e891ac564f45c9369b369e243511960320cb3b75864'],
  'bona-fide-iced-coffee-with-cream.webp': [45548, '241b9fb7a038ee77b7257c8c0fa739265e592864722972133f3607dab33708d4'],
  'bona-fide-nitro-coffee-keg.png': [86285, 'ff278441e70dc8fc9521743a6342ebb306117c07f0143ef937cf4fbe79ae1858'],
  'bona-fide-nitro-coffee-keg.webp': [26340, 'c5edf15148b0e0d61c172e575c1f0b015f2c60dea5a4c879040a6193331782a7'],
};

test('render directory contains exactly the pinned files', () => {
  assert.deepEqual(fs.readdirSync(DIR).sort(), Object.keys(FILES).sort());
});

for (const [name, [size, sha]] of Object.entries(FILES)) {
  test(`${name} matches pinned size, hash, signature and size cap`, () => {
    const buf = fs.readFileSync(`${DIR}/${name}`);
    assert.equal(buf.length, size);
    assert.ok(buf.length <= MAX_BYTES, 'over web size cap');
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), sha);
    if (name.endsWith('.png')) assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    else assert.ok(buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP');
  });
}

test('renders are not referenced by any page source (not placed in this Block)', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  const hits = walk('src').filter((f) => fs.readFileSync(f, 'utf8').includes('product-renders'));
  assert.deepEqual(hits, []);
});
