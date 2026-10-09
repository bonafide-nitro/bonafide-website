// Block 26 (Issue #70): the indexed offices-coffee PDF (I3) is preserved byte-for-byte at its exact, case-sensitive path.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIR = 'wp-content/uploads/2021/09';
const NAME = '17x11-Bona-FIde-coffee-for-Offices-version-10-Email_compressed.pdf';
const URL_PATH = `/${DIR}/${NAME}`;
// Identity of the operator-supplied original (Issue #70 ZANETA_DECISION).
const SIZE = 956136;
const SHA256 = '4b74753d978844d00b7d4c7a38c8dc0cc3d38bece2d2fa12b6753c5eafd47f9b';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);

// Case-sensitive existence: readdir returns the on-disk spelling, unlike fs.existsSync on case-insensitive filesystems.
const listed = (root) => fs.readdirSync(path.join(root, DIR));

const checkPdf = (file) => {
  const buf = fs.readFileSync(file);
  assert.ok(buf.length > 0, 'PDF is empty');
  assert.equal(buf.subarray(0, 5).toString('latin1'), '%PDF-', 'missing PDF signature');
  assert.match(buf.subarray(0, 1024).toString('latin1'), /^%PDF-1\.\d/, 'malformed PDF header');
  assert.match(buf.subarray(-2048).toString('latin1'), /%%EOF\s*$/, 'missing %%EOF trailer');
  assert.doesNotMatch(buf.subarray(0, 512).toString('latin1'), /<!doctype|<html/i, 'HTML masquerading as PDF');
  return buf;
};

test('source PDF exists at the exact case-sensitive path under public/', () => {
  assert.ok(listed('public').includes(NAME), `${NAME} not found with exact case in public/${DIR}`);
});

test('source PDF is a valid PDF, not HTML/error content', () => { checkPdf(`public/${DIR}/${NAME}`); });

test('source PDF is byte-identical to the operator-supplied original', () => {
  const buf = fs.readFileSync(`public/${DIR}/${NAME}`);
  assert.equal(buf.length, SIZE);
  assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), SHA256);
});

t('built PDF exists at the exact case-sensitive indexed path', () => {
  assert.ok(listed('dist').includes(NAME), `${NAME} not found with exact case in dist/${DIR}`);
});

t('built PDF is a valid PDF and byte-identical to the source', () => {
  const out = checkPdf(`dist/${DIR}/${NAME}`);
  assert.ok(out.equals(fs.readFileSync(`public/${DIR}/${NAME}`)));
});

test('the exact indexed path is not redirected (the PDF is preserved)', () => {
  const files = fs.existsSync('deploy') ? fs.readdirSync('deploy').map((f) => path.join('deploy', f)) : [];
  for (const f of ['src/data/redirects.yaml', ...files]) {
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) continue;
    const txt = fs.readFileSync(f, 'utf8');
    assert.ok(!txt.includes('Offices-version-10'), `${f} must not reference the PDF path`);
    assert.ok(!txt.includes(URL_PATH), `${f} must not redirect ${URL_PATH}`);
  }
});
