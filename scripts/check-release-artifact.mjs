// Block 43 (Issue #103): deterministic, read-only preflight over a built static dist/.
// Complements QA T11 and `check:dist`: it proves the *file set* is what a static site should
// contain (no executable/WordPress-runtime/backup/server-config files, no obfuscation primitives,
// no WordPress theme/plugin runtime references) and can emit/verify a SHA-256 file manifest so a
// staged copy can later be compared byte-for-byte with the archived build.
// It never contacts a network and never writes inside dist/. A pass proves nothing about the
// live WordPress site, the hosting account, or a clean rollback copy.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadBaseline } from '../src/lib/data.mjs';

export const ALLOWED_EXT = new Set([
  'html', 'css', 'js', 'mjs', 'json', 'xml', 'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp',
  'avif', 'svg', 'ico', 'woff', 'woff2', 'webmanifest', 'gitkeep',
]);
export const FORBIDDEN_DIRS = [
  '.git', 'node_modules', 'wp-admin', 'wp-includes', 'wp-json',
  'wp-content/plugins', 'wp-content/themes', 'wp-content/mu-plugins', 'wp-content/upgrade',
];
const FORBIDDEN_NAMES = /^(?:\.htaccess|\.htpasswd|\.env.*|wp-config.*|xmlrpc\.php)$/i;
const TEXT_EXT = /\.(?:html|css|m?js|json|xml|txt|svg|webmanifest)$/i;
// Identifiers recorded as confirmed compromise indicators (master plan §3.1 C1/C3).
export const COMPROMISE_IDENTIFIERS = ['kEWRpcHH', 'wConDmkjW', 'lcKgBdJa', 'NdLCkEWOVdMG', 'hSkdzblcUG'];
const OBFUSCATION = [
  ['eval-call', /\beval\s*\(/],
  ['atob-call', /\batob\s*\(/],
  ['function-constructor', /\bnew\s+Function\s*\(/],
  ['from-char-code', /String\s*\.\s*fromCharCode/],
  ['document-write', /document\s*\.\s*write(?:ln)?\s*\(/],
  ['unescape-call', /\bunescape\s*\(/],
  ['hex-escape-run', /(?:\\x[0-9a-f]{2}){8,}/i],
];
const WP_RUNTIME = [
  ['wp-theme-or-plugin-path', /wp-content\/(?:themes|plugins|mu-plugins)\//i],
  ['wp-includes-path', /wp-includes\//i],
  ['wp-admin-path', /wp-admin\//i],
  ['wp-json-path', /wp-json\b/i],
  ['wp-login-or-xmlrpc', /wp-login\.php|xmlrpc\.php/i],
  ['wp-generator-meta', /<meta[^>]+name=["']generator["'][^>]+WordPress/i],
  ['meta-refresh', /<meta[^>]+http-equiv=["']refresh["']/i],
];

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Walks without following links: Dirent reports a symlink as neither directory nor file, so
// symlinks (and sockets, FIFOs, devices) land in `irregular` and are never read or hashed.
export const walkTree = (dir) => {
  const files = [];
  const irregular = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(dir, p).split(path.sep).join('/');
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) files.push(rel);
      else irregular.push(rel);
    }
  };
  walk(dir);
  return { files: files.sort(cmp), irregular: irregular.sort(cmp) };
};

export const listFiles = (dir) => walkTree(dir).files;

export const buildManifest = (dir) => {
  const { irregular } = walkTree(dir);
  if (irregular.length) throw new Error(`non-regular entries (symlink/special) cannot be manifested: ${irregular.join(', ')}`);
  const files = listFiles(dir).map((p) => {
    const buf = fs.readFileSync(path.join(dir, p));
    return { path: p, bytes: buf.length, sha256: sha256(buf) };
  });
  const treeSha256 = sha256(files.map((f) => `${f.path}\0${f.sha256}\n`).join(''));
  return { fileCount: files.length, treeSha256, files };
};

export const diffManifest = (expected, actual) => {
  const a = new Map(expected.files.map((f) => [f.path, f.sha256]));
  const b = new Map(actual.files.map((f) => [f.path, f.sha256]));
  return {
    missing: [...a.keys()].filter((p) => !b.has(p)).sort(cmp),
    extra: [...b.keys()].filter((p) => !a.has(p)).sort(cmp),
    changed: [...a.keys()].filter((p) => b.has(p) && b.get(p) !== a.get(p)).sort(cmp),
  };
};

export const scanArtifact = (dir, forbiddenStrings = []) => {
  const findings = [];
  const add = (rule, file, detail) => findings.push({ rule, file, detail });
  const { files, irregular } = walkTree(dir);
  for (const rel of irregular) add('non-regular-entry', rel, 'symlink or special file');
  for (const rel of files) {
    const lower = rel.toLowerCase();
    const base = path.posix.basename(lower);
    const ext = base.includes('.') ? base.split('.').pop() : '';
    for (const d of FORBIDDEN_DIRS) {
      if (lower === d || lower.startsWith(`${d}/`) || lower.includes(`/${d}/`)) add('forbidden-directory', rel, d);
    }
    if (FORBIDDEN_NAMES.test(base)) add('forbidden-file-name', rel, base);
    else if (!ALLOWED_EXT.has(ext)) add('disallowed-file-type', rel, ext ? `.${ext}` : '(no extension)');
    for (const n of forbiddenStrings) if (lower.includes(n.toLowerCase())) add('forbidden-string-in-path', rel, n);
    if (!TEXT_EXT.test(rel)) continue;
    const text = fs.readFileSync(path.join(dir, rel)).toString('latin1');
    const lowerText = text.toLowerCase();
    for (const n of [...forbiddenStrings, ...COMPROMISE_IDENTIFIERS]) {
      if (lowerText.includes(n.toLowerCase())) add('forbidden-string', rel, n);
    }
    for (const [rule, re] of OBFUSCATION) if (re.test(text)) add(rule, rel, String(re));
    for (const [rule, re] of WP_RUNTIME) if (re.test(text)) add(rule, rel, String(re));
    if (ext === 'svg' && /<script\b/i.test(text)) add('svg-script', rel, '<script> in SVG');
  }
  return findings;
};

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};

if (import.meta.url === `file://${process.argv[1]}`) {
  // A flag present without a non-empty value is a usage error, never a silent skip or default.
  const flagValue = (name) => {
    if (!process.argv.includes(name)) return null;
    const v = arg(name);
    if (!v || v.startsWith('--')) { console.error(`${name} requires a non-empty file path`); process.exit(2); }
    return v;
  };
  const dir = path.resolve(flagValue('--dir') ?? 'dist');
  if (!fs.existsSync(dir)) { console.error(`${dir} missing — run \`npm run build\` first`); process.exit(2); }
  const writeTo = flagValue('--write-manifest');
  const verify = flagValue('--verify-manifest');
  // Read the verification baseline before any write, so a write path that aliases it
  // (same path, symlink or hard link) cannot make the artifact compare against itself.
  let baseline = null;
  if (verify) {
    if (writeTo && fs.existsSync(writeTo) && fs.existsSync(verify)) {
      const a = fs.statSync(writeTo);
      const b = fs.statSync(verify);
      if (a.dev === b.dev && a.ino === b.ino) {
        console.error('--write-manifest and --verify-manifest must not name the same file');
        process.exit(2);
      }
    }
    if (writeTo && path.resolve(writeTo) === path.resolve(verify)) {
      console.error('--write-manifest and --verify-manifest must not name the same file');
      process.exit(2);
    }
    baseline = JSON.parse(fs.readFileSync(verify, 'utf8'));
  }
  const findings = scanArtifact(dir, loadBaseline().preservationRules.forbiddenBuildStrings);
  for (const f of findings) console.error(`[${f.rule}] ${f.file}: ${f.detail}`);
  let failed = findings.length > 0;
  if (findings.some((f) => f.rule === 'non-regular-entry')) {
    console.log(`FAIL: ${findings.length} finding(s); manifest not written or verified because the tree has non-regular entries`);
    process.exit(1);
  }
  const manifest = buildManifest(dir);
  if (writeTo) fs.writeFileSync(writeTo, `${JSON.stringify(manifest, null, 2)}\n`);
  if (verify) {
    const d = diffManifest(baseline, manifest);
    for (const k of ['missing', 'extra', 'changed']) for (const p of d[k]) console.error(`[manifest-${k}] ${p}`);
    if (d.missing.length || d.extra.length || d.changed.length) failed = true;
  }
  console.log(`${failed ? 'FAIL' : 'OK'}: ${manifest.fileCount} files, tree sha256 ${manifest.treeSha256}, ${findings.length} finding(s)`);
  process.exit(failed ? 1 : 0);
}
