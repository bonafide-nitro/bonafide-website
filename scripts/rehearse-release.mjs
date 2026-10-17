// Block 62 (Issue #141): offline rehearsal of the packaged release zip.
// `check:artifact` and `package:preview` inspect dist/ BEFORE zipping; nothing inspected the zip itself.
// This reads the zip central directory in Node (no extraction yet), refuses unsafe entries, extracts into an
// isolated temp directory, then proves the extracted site/ is the exact built artifact and is safe to copy
// into a webroot. It contacts no network, reads no credentials, writes only to the temp directory, and
// touches neither WordPress, cPanel, DNS nor any host. PASS proves nothing about a host or a rollback copy.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildManifest, diffManifest, scanArtifact } from './check-release-artifact.mjs';
import { loadBaseline } from '../src/lib/data.mjs';

export const PACKAGE_ROOT = 'bonafide-preview';
export const PREVIEW_ONLY_FILES = ['Open-Preview.command', 'READ-ME-FIRST.txt', 'PREVIEW-INFO.json'];
export const REQUIRED_SITE_FILES = ['index.html', '404.html', 'robots.txt', 'sitemap.xml'];
// Staging/preview-only directives that must never appear in production site content.
const STAGING_MARKERS = [
  ['x-robots-tag', /x-robots-tag/i],
  ['auth-directive', /\bAuthUserFile\b|\bAuthType\b|\bRequire\s+valid-user\b/],
  ['htpasswd', /\.htpasswd/i],
  ['placeholder', /@@[A-Z0-9_]+@@/],
];
const TEXT_EXT = /\.(?:html|css|m?js|json|xml|txt|svg|webmanifest)$/i;

const S_IFMT = 0o170000;
const S_IFREG = 0o100000;
const S_IFDIR = 0o040000;

// Minimal central-directory reader. Zip64 and multi-disk archives are not produced by `zip -X -r`
// for this site; they are reported as unreadable rather than guessed at.
export const readZipEntries = (buf) => {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('end-of-central-directory record not found');
  const disk = buf.readUInt16LE(eocd + 4);
  const count = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (disk !== 0 || count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) throw new Error('multi-disk or zip64 archives are not supported');
  if (cdOffset + cdSize > buf.length) throw new Error('central directory exceeds file size');
  const entries = [];
  let p = cdOffset;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`bad central-directory header #${n}`);
    const madeBy = buf.readUInt16LE(p + 4);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const external = buf.readUInt32LE(p + 38);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const host = madeBy >> 8;
    entries.push({ name, unixMode: host === 3 ? external >>> 16 : null, dosDir: (external & 0x10) !== 0 || name.endsWith('/') });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
};

const unsafeNameReason = (name) => {
  if (name.includes('\0')) return 'NUL byte';
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(name)) return 'control character';
  if (name.includes('\\')) return 'backslash';
  if (name.startsWith('/')) return 'absolute path';
  if (/^[a-z]:/i.test(name)) return 'drive letter';
  const parts = name.replace(/\/$/, '').split('/');
  if (parts.includes('..')) return 'parent-directory segment';
  if (parts.includes('.')) return 'current-directory segment';
  if (parts.includes('')) return 'empty path segment';
  return null;
};

export const checkEntries = (entries) => {
  const f = [];
  const add = (invariant, file, detail) => f.push({ invariant, file, detail });
  if (!entries.length) add('R1-zip-structure', '(zip)', 'archive has no entries');
  const seen = new Map();
  for (const e of entries) {
    const why = unsafeNameReason(e.name);
    if (why) add('R2-entry-path', e.name, why);
    const key = e.name.replace(/\/$/, '').toLowerCase();
    if (seen.has(key)) add('R2-entry-path', e.name, `duplicate of ${seen.get(key)} (case-insensitive)`);
    else seen.set(key, e.name);
    if (e.unixMode !== null) {
      const type = e.unixMode & S_IFMT;
      if (type !== S_IFREG && type !== S_IFDIR && type !== 0) add('R3-entry-type', e.name, `symlink or special file (mode ${e.unixMode.toString(8)})`);
    }
    const top = e.name.split('/')[0];
    if (top !== PACKAGE_ROOT) { add('R4-layout', e.name, `entry is outside the single top-level "${PACKAGE_ROOT}/" directory`); continue; }
    const rest = e.name.slice(PACKAGE_ROOT.length + 1).replace(/\/$/, '');
    if (rest && !rest.startsWith('site/') && rest !== 'site' && !PREVIEW_ONLY_FILES.includes(rest)) add('R4-layout', e.name, 'not site/ content and not a known preview file');
  }
  return f;
};

const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

// Attribute order and quoting inside <meta> are irrelevant to crawlers, so parse each tag's attributes (quoted or unquoted values).
const metaAttrs = (tag) => {
  const attrs = {};
  for (const m of tag.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) attrs[m[1].toLowerCase()] ??= m[2] ?? m[3] ?? m[4] ?? '';
  return attrs;
};
const hasRobotsNoindex = (html) => (html.match(/<meta\b[^>]*>/gi) ?? []).some((tag) => {
  const a = metaAttrs(tag.replace(/^<meta\b/i, ''));
  return /^robots$/i.test(a.name ?? '') && /noindex/i.test(a.content ?? '');
});

const redirectTargets = (redirectsText) => [...redirectsText.matchAll(/^RewriteRule\s+\S+\s+https:\/\/bonafidenitro\.com(\/[^\s?]*)/gm)].map((m) => m[1]);

export const checkSite = (siteDir, { forbiddenStrings = [], redirects = null } = {}) => {
  const f = [];
  const add = (invariant, file, detail) => f.push({ invariant, file, detail });
  for (const x of scanArtifact(siteDir, forbiddenStrings)) add('R5-site-content', x.file, `${x.rule}: ${x.detail}`);
  for (const rel of REQUIRED_SITE_FILES) if (!isFile(path.join(siteDir, rel))) add('R4-layout', `site/${rel}`, 'required file missing from package or not a regular file');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : e.isFile() ? [p] : [];
  });
  for (const p of walk(siteDir)) {
    const rel = path.relative(siteDir, p).split(path.sep).join('/');
    if (!TEXT_EXT.test(rel)) continue;
    const text = fs.readFileSync(p, 'latin1');
    for (const [name, re] of STAGING_MARKERS) if (re.test(text)) add('R6-env-separation', `site/${rel}`, `staging/preview marker in production content: ${name}`);
  }
  const index = path.join(siteDir, 'index.html');
  if (isFile(index) && hasRobotsNoindex(fs.readFileSync(index, 'utf8'))) add('R6-env-separation', 'site/index.html', 'home page carries noindex');
  const robots = path.join(siteDir, 'robots.txt');
  if (isFile(robots) && /^\s*disallow:\s*\/\s*$/im.test(fs.readFileSync(robots, 'utf8'))) add('R6-env-separation', 'site/robots.txt', 'blanket "Disallow: /"');
  if (redirects) {
    // Pattern destinations (back-references such as /$1/) have no single file to look up.
    for (const t of new Set(redirectTargets(redirects))) {
      if (/[$%]/.test(t)) continue;
      const rel = t === '/' ? 'index.html' : t.endsWith('/') ? `${t.slice(1)}index.html` : t.slice(1);
      if (!fs.existsSync(path.join(siteDir, rel))) add('R7-redirect-target', `site/${rel}`, `redirect destination ${t} has no file in the package`);
    }
  }
  return f;
};

export const rehearse = ({ zip, dist = null, redirects = null, forbiddenStrings = [] }) => {
  const findings = [];
  const add = (list) => findings.push(...list);
  const result = { findings, copyPlan: null, tree: null };
  let buf;
  try { buf = fs.readFileSync(zip); } catch { add([{ invariant: 'R1-zip-structure', file: zip, detail: 'zip not readable' }]); return result; }
  let entries;
  try { entries = readZipEntries(buf); } catch (e) { add([{ invariant: 'R1-zip-structure', file: zip, detail: e.message }]); return result; }
  add(checkEntries(entries));
  if (findings.length) return result; // never extract an archive whose entries are unsafe
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b62-'));
  try {
    const r = spawnSync('unzip', ['-q', '-o', path.resolve(zip), '-d', tmp], { encoding: 'utf8' });
    if (r.status !== 0) { add([{ invariant: 'R1-zip-structure', file: zip, detail: `unzip failed: ${r.stderr || r.error}` }]); return result; }
    const root = path.join(tmp, PACKAGE_ROOT);
    const site = path.join(root, 'site');
    if (!isDir(site)) { add([{ invariant: 'R4-layout', file: `${PACKAGE_ROOT}/site`, detail: 'site/ directory missing or not a directory' }]); return result; }
    for (const w of PREVIEW_ONLY_FILES) if (!isFile(path.join(root, w))) add([{ invariant: 'R4-layout', file: `${PACKAGE_ROOT}/${w}`, detail: 'required preview wrapper file missing or not a regular file' }]);
    add(checkSite(site, { forbiddenStrings, redirects }));
    if (!findings.some((x) => x.invariant === 'R5-site-content' && /non-regular/.test(x.detail))) {
      const manifest = buildManifest(site);
      result.tree = { fileCount: manifest.fileCount, treeSha256: manifest.treeSha256 };
      const infoPath = path.join(root, 'PREVIEW-INFO.json');
      if (!fs.existsSync(infoPath)) add([{ invariant: 'R8-manifest', file: 'PREVIEW-INFO.json', detail: 'missing' }]);
      else {
        let info = {};
        try { info = JSON.parse(fs.readFileSync(infoPath, 'utf8')); } catch { add([{ invariant: 'R8-manifest', file: 'PREVIEW-INFO.json', detail: 'not valid JSON' }]); }
        if (info.treeSha256 !== manifest.treeSha256 || info.fileCount !== manifest.fileCount) add([{ invariant: 'R8-manifest', file: 'PREVIEW-INFO.json', detail: 'recorded treeSha256/fileCount differ from the extracted site/' }]);
      }
      if (dist) {
        const d = diffManifest(buildManifest(dist), manifest);
        for (const k of ['missing', 'extra', 'changed']) for (const p of d[k]) add([{ invariant: 'R8-manifest', file: `site/${p}`, detail: `${k} versus the built dist/` }]);
      }
      result.copyPlan = {
        from: `${PACKAGE_ROOT}/site/ (contents)`,
        files: manifest.fileCount,
        neverCopy: PREVIEW_ONLY_FILES,
      };
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return result;
};

const flag = (name) => {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  if (!v || v.startsWith('--')) { console.error(`${name} requires a non-empty path`); process.exit(2); }
  return v;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const zip = path.resolve(flag('--zip') ?? 'preview-out/bonafide-preview.zip');
  const distArg = flag('--dist') ?? (fs.existsSync('dist') ? 'dist' : null);
  const redirectsFile = path.resolve(flag('--redirects') ?? 'deploy/apache/redirects.htaccess');
  const { findings, copyPlan, tree } = rehearse({
    zip,
    dist: distArg ? path.resolve(distArg) : null,
    redirects: fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile, 'utf8') : null,
    forbiddenStrings: loadBaseline().preservationRules.forbiddenBuildStrings,
  });
  if (findings.length) {
    for (const x of findings) console.error(`[${x.invariant}] ${x.file}: ${x.detail}`);
    console.log(`BLOCKED: ${findings.length} finding(s) across ${[...new Set(findings.map((x) => x.invariant))].join(', ')}`);
    process.exit(1);
  }
  console.log(`PASS: ${copyPlan.files} site files, tree sha256 ${tree.treeSha256}${distArg ? ', identical to built dist/' : ' (no dist/ to compare)'}`);
  console.log(`Copy plan (offline, not executed): copy ${copyPlan.from} into the webroot; never copy ${copyPlan.neverCopy.join(', ')}. WordPress stays untouched as rollback.`);
}
