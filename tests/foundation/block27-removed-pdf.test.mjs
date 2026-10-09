// Block 27 (Issue #72): the 2026 marketing-plan PDF (I2) is a deliberate removal (ZANETA_DECISION) and must never reappear.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'wp-content/uploads/2026/02';
const NAME = 'Bona-Fide-Marketing-Plan-2026.pdf';
const URL_PATH = `/${DIR}/${NAME}`;

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);

// Case-insensitive so a re-cased copy cannot slip in; tolerates the directory not existing at all.
const hasPdf = (root) => {
  const dir = path.join(root, DIR);
  return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.toLowerCase() === NAME.toLowerCase());
};

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

test('the marketing-plan PDF is not present in public/', () => {
  assert.ok(!hasPdf('public'), `${NAME} must not be added to public/${DIR}`);
});

t('the marketing-plan PDF is not present in the built output', () => {
  assert.ok(!hasPdf('dist'), `${NAME} must not appear in dist/${DIR}`);
});

test('no file in public/ is a copy of the marketing-plan PDF under another name', () => {
  const root = path.join('public', DIR);
  if (!fs.existsSync(root)) return;
  for (const f of walk(root)) {
    assert.ok(!/marketing-plan/i.test(path.basename(f)), `${f} looks like the removed marketing plan`);
  }
});

test('the removed path is not redirected or otherwise referenced in routing config', () => {
  const files = fs.existsSync('deploy') ? walk('deploy') : [];
  for (const f of ['src/data/redirects.yaml', ...files]) {
    if (!fs.existsSync(f)) continue;
    const txt = fs.readFileSync(f, 'utf8');
    assert.ok(!/Marketing-Plan-2026/i.test(txt), `${f} must not reference the removed PDF`);
    assert.ok(!txt.includes(URL_PATH), `${f} must not redirect ${URL_PATH}`);
  }
});
