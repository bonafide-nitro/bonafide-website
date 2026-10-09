// Block 28 (Issue #74): the article scaffold set is explicit and deterministic.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('qa/qa.config.json', 'utf8'));
const { cleared, remaining } = config.articleScaffold;
const remainingPaths = Object.keys(remaining);
const srcOf = (p) => fs.readFileSync(`src/pages${p}index.astro`, 'utf8');
const hasMarker = (src) => /<Base\b[^>]*\sscaffold(\s|>|\/)/.test(src);

test('cleared + remaining equals articleRoutes exactly, no overlap', () => {
  assert.deepEqual([...cleared, ...remainingPaths].sort(), [...config.articleRoutes].sort());
  assert.equal(new Set([...cleared, ...remainingPaths]).size, config.articleRoutes.length);
});

test('every remaining route records a non-empty blocker', () => {
  for (const [p, why] of Object.entries(remaining)) assert.ok(typeof why === 'string' && why.length > 20, p);
});

for (const p of remainingPaths) {
  test(`${p}: stays scaffolded (source)`, () => assert.ok(hasMarker(srcOf(p))));
}
for (const p of cleared) {
  test(`${p}: cleared route carries no scaffold marker or scaffold comment (source)`, () => {
    const src = srcOf(p);
    assert.ok(!hasMarker(src));
    assert.ok(!/<!--\s*scaffold:/.test(src));
  });
}

const built = fs.existsSync('dist/index.html');
for (const p of config.articleRoutes) {
  test(`${p}: built scaffold marker matches the declaration`, { skip: !built && 'dist/ not built' }, () => {
    const html = fs.readFileSync(`dist${p}index.html`, 'utf8');
    assert.equal(html.includes('scaffold-placeholder'), p in remaining);
  });
}
