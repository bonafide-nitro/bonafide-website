// Block 29 (Issue #76): the non-article scaffold set is explicit and deterministic.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const config = JSON.parse(fs.readFileSync('qa/qa.config.json', 'utf8'));
const { cleared, remaining } = config.nonArticleScaffold;
const remainingPaths = Object.keys(remaining);
const srcOf = (p) => fs.readFileSync(p === '/' ? 'src/pages/index.astro' : `src/pages${p}index.astro`, 'utf8');
const hasMarker = (src) => /<Base\b[^>]*\sscaffold(\s|>|\/)/.test(src);

// Every source page that currently carries a scaffold marker.
function scaffoldedRoutes(dir = 'src/pages', out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) scaffoldedRoutes(f, out);
    else if (e.name.endsWith('.astro') && hasMarker(fs.readFileSync(f, 'utf8'))) {
      const rel = path.relative('src/pages', path.dirname(f)).split(path.sep).join('/');
      out.push(rel ? `/${rel}/` : '/');
    }
  }
  return out;
}

test('cleared and remaining are disjoint from articleRoutes and from each other', () => {
  const all = [...cleared, ...remainingPaths];
  assert.equal(new Set(all).size, all.length);
  for (const p of all) assert.ok(!config.articleRoutes.includes(p), p);
});

test('scaffolded source routes equal article remaining + non-article remaining (no silent drift)', () => {
  const expected = [...Object.keys(config.articleScaffold.remaining), ...remainingPaths].sort();
  assert.deepEqual(scaffoldedRoutes().sort(), expected);
  assert.equal(remainingPaths.length + cleared.length, 20);
});

test('every remaining route records a non-empty blocker', () => {
  for (const [p, why] of Object.entries(remaining)) assert.ok(typeof why === 'string' && why.length > 20, p);
});

for (const p of remainingPaths) test(`${p}: stays scaffolded (source)`, () => assert.ok(hasMarker(srcOf(p))));
for (const p of cleared) {
  test(`${p}: cleared route carries no scaffold marker or comment (source)`, () => {
    const src = srcOf(p);
    assert.ok(!hasMarker(src));
    assert.ok(!/<!--\s*scaffold/.test(src));
  });
}

const built = fs.existsSync('dist/index.html');
for (const p of [...cleared, ...remainingPaths]) {
  test(`${p}: built scaffold marker matches the declaration`, { skip: !built && 'dist/ not built' }, () => {
    const html = fs.readFileSync(p === '/' ? 'dist/index.html' : `dist${p}index.html`, 'utf8');
    assert.equal(html.includes('scaffold-placeholder'), p in remaining);
  });
}
