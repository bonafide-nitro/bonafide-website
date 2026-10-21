// Issue #162: offline rollback-package preparation and fail-closed preflight.
// From the packaged release zip this writes a deterministic upload manifest (path, bytes, sha256), a
// `sha256sum -c` compatible SHA256SUMS, an explicit upload/restoration order and an owner prerequisites report,
// then SIMULATES reinstalling a retained release over a newer one in a throwaway directory and proves the tree is
// byte-identical to the retained manifest again. It never reads a real WordPress backup, host, credential or
// network, and a PASS here is NOT evidence that any real rollback has worked.
// `--mode cutover` additionally fails unless every owner prerequisite in deploy/rollback/prerequisites.json is
// CONFIRMED with a GitHub evidence URL; the committed file is all OPEN, so cutover mode exits 1 today.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { rehearse, PACKAGE_ROOT } from './rehearse-release.mjs';
import { buildManifest, walkTree } from './check-release-artifact.mjs';
import { loadBaseline } from '../src/lib/data.mjs';
import { preflight } from './build-apache-config.mjs';

export const REQUIRED_PREREQUISITES = [
  'W1-clean-wordpress-copy', 'W2-live-backup-day-of', 'W3-forensic-snapshot', 'W4-isolated-restore-timed', 'W5-credentials-rotated',
  'W6-docroot-model-decided', 'W7-wordpress-htaccess-saved', 'W8-release-package-archived', 'W9-decision-maker-window',
];
const EVIDENCE_URL = /^https:\/\/github\.com\/bonafide-nitro\/bonafide-website\/(?:issues|pull)\/\d+#(?:issuecomment|pullrequestreview|discussion_r)-?\d+$/;
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Upload order: assets first, pages next, the 404 page and crawler files, the home page, and the .htaccess LAST so
// redirects and the 404 handler only activate once every destination exists. Reverse for removal.
export const stage = (rel) => {
  if (rel === '.htaccess') return 6;
  if (rel === 'index.html') return 5;
  if (rel === 'robots.txt' || rel === 'sitemap.xml') return 4;
  if (rel === '404.html') return 3;
  if (rel.endsWith('.html')) return 2;
  return 1;
};
export const STAGE_NAMES = { 1: 'assets and other non-HTML files', 2: 'inner pages', 3: '404.html', 4: 'robots.txt and sitemap.xml', 5: 'home page index.html', 6: '.htaccess (production candidate, last)' };

export const releaseManifest = (siteDir, htaccessText) => {
  const base = buildManifest(siteDir);
  const files = [...base.files, { path: '.htaccess', bytes: Buffer.byteLength(htaccessText), sha256: sha256(Buffer.from(htaccessText)) }]
    .map((f) => ({ ...f, stage: stage(f.path) }))
    .sort((a, b) => a.stage - b.stage || cmp(a.path, b.path));
  const treeSha256 = sha256([...files].sort((a, b) => cmp(a.path, b.path)).map((f) => `${f.path}\0${f.sha256}\n`).join(''));
  return { format: 1, fileCount: files.length, totalBytes: files.reduce((n, f) => n + f.bytes, 0), treeSha256, stages: STAGE_NAMES, files };
};

export const sha256sums = (manifest) => `${[...manifest.files].sort((a, b) => cmp(a.path, b.path)).map((f) => `${f.sha256}  ${f.path}`).join('\n')}\n`;

export const restoreOrderText = (manifest) => [
  'RELEASE INSTALL / REINSTALL ORDER (offline-derived; the host procedure is owner-performed and host-unverified)',
  '',
  'Needs only: this package (bonafide-release.zip + release-manifest.json + SHA256SUMS), unzip, and sha256sum. No external service.',
  '',
  '0. Prerequisites that are NOT in this package and must be CONFIRMED first: see deploy/rollback/prerequisites.json (clean WordPress copy,',
  '   day-of backup, forensic snapshot, timed restore rehearsal, credentials, docroot model, WordPress .htaccess copy, decision-maker).',
  '1. Unzip bonafide-release.zip into an empty scratch directory. Never copy Open-Preview.command, READ-ME-FIRST.txt or PREVIEW-INFO.json.',
  '2. Copy the bundled production.htaccess (next to this file in the rollback package; the exact file that was rehearsed) into the scratch bonafide-preview/site/ directory as .htaccess (it is not inside the zip).',
  '   Then, in that directory, run: sha256sum -c <absolute path of SHA256SUMS from this rollback package> (every line must say OK; SHA256SUMS stays beside the zip, not inside the extracted tree).',
  '3. Upload in stage order. Do not skip a stage, and do not delete anything outside these paths (WordPress files are never touched by the static upload):',
  ...Object.entries(STAGE_NAMES).map(([n, name]) => `   stage ${n}: ${name} (${manifest.files.filter((f) => f.stage === Number(n)).length} file(s))`),
  '4. After upload, re-run sha256sum -c against the live tree; any mismatch means stop and use the rollback procedure in master plan 15.4.',
  '5. To go back to a retained release: repeat steps 1-4 with that release\'s package; remove only files that are in the newer manifest and not',
  '   in the retained one. Rolling back to WordPress instead is master plan 15.4 and needs prerequisites W1, W2, W6, W7.',
  '',
  `Manifest: ${manifest.fileCount} files, ${manifest.totalBytes} bytes, tree sha256 ${manifest.treeSha256}`,
  '',
].join('\n');

export const checkPrerequisites = (doc) => {
  const problems = [];
  const items = Array.isArray(doc?.prerequisites) ? doc.prerequisites : null;
  if (!items) return { problems: ['prerequisites.json has no "prerequisites" array'], open: REQUIRED_PREREQUISITES, confirmed: [] };
  const byId = new Map();
  for (const it of items) {
    if (byId.has(it?.id)) problems.push(`duplicate prerequisite id ${it.id}`);
    byId.set(it?.id, it);
    if (!REQUIRED_PREREQUISITES.includes(it?.id)) problems.push(`unknown prerequisite id ${it?.id}`);
    if (!['OPEN', 'CONFIRMED'].includes(it?.status)) problems.push(`${it?.id}: status must be OPEN or CONFIRMED`);
    if (it?.status === 'CONFIRMED' && !EVIDENCE_URL.test(it.evidence ?? '')) problems.push(`${it.id}: CONFIRMED requires a GitHub issue/PR comment URL as evidence`);
    if (it?.status === 'OPEN' && it.evidence) problems.push(`${it.id}: OPEN prerequisite must not carry evidence`);
  }
  for (const id of REQUIRED_PREREQUISITES) if (!byId.has(id)) problems.push(`required prerequisite ${id} is missing`);
  const confirmed = REQUIRED_PREREQUISITES.filter((id) => byId.get(id)?.status === 'CONFIRMED' && EVIDENCE_URL.test(byId.get(id)?.evidence ?? ''));
  return { problems, open: REQUIRED_PREREQUISITES.filter((id) => !confirmed.includes(id)), confirmed };
};

// Throwaway-directory install: copies the manifest's files in stage order, removing only files the previous tree had.
export const applyRelease = (docroot, siteDir, htaccessText, manifest) => {
  const wanted = new Set(manifest.files.map((f) => f.path));
  for (const rel of walkTree(docroot).files) if (!wanted.has(rel)) fs.rmSync(path.join(docroot, rel));
  for (const f of manifest.files) {
    const dest = path.join(docroot, f.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (f.path === '.htaccess') fs.writeFileSync(dest, htaccessText);
    else fs.copyFileSync(path.join(siteDir, f.path), dest);
  }
};
export const verifyTree = (docroot, manifest) => {
  const problems = [];
  const have = new Map(walkTree(docroot).files.map((rel) => [rel, sha256(fs.readFileSync(path.join(docroot, rel)))]));
  for (const f of manifest.files) {
    if (!have.has(f.path)) problems.push(`missing ${f.path}`);
    else if (have.get(f.path) !== f.sha256) problems.push(`changed ${f.path}`);
  }
  const wanted = new Set(manifest.files.map((f) => f.path));
  for (const rel of have.keys()) if (!wanted.has(rel)) problems.push(`extra ${rel}`);
  return problems;
};

// retained release R is installed, a different "newer" release overwrites it (changed + added + removed files),
// then R is reinstalled from its retained package and the tree must equal R's manifest exactly.
export const simulateReinstall = ({ retained, newer }) => {
  const problems = [];
  const docroot = fs.mkdtempSync(path.join(os.tmpdir(), 'b162-dr-'));
  try {
    applyRelease(docroot, retained.siteDir, retained.htaccess, retained.manifest);
    problems.push(...verifyTree(docroot, retained.manifest).map((p) => `initial install: ${p}`));
    applyRelease(docroot, newer.siteDir, newer.htaccess, newer.manifest);
    problems.push(...verifyTree(docroot, newer.manifest).map((p) => `newer install: ${p}`));
    if (retained.manifest.treeSha256 === newer.manifest.treeSha256) problems.push('simulation is vacuous: newer release equals the retained release');
    applyRelease(docroot, retained.siteDir, retained.htaccess, retained.manifest);
    problems.push(...verifyTree(docroot, retained.manifest).map((p) => `reinstall of retained release: ${p}`));
    return problems;
  } finally { fs.rmSync(docroot, { recursive: true, force: true }); }
};

const extract = (zip) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b162-pkg-'));
  const r = spawnSync('unzip', ['-q', '-o', path.resolve(zip), '-d', tmp], { encoding: 'utf8' });
  if (r.status !== 0) { fs.rmSync(tmp, { recursive: true, force: true }); throw new Error(`unzip failed: ${r.stderr}`); }
  return { tmp, siteDir: path.join(tmp, PACKAGE_ROOT, 'site') };
};

export const prepareRollbackPackage = ({ zip, previousZip = null, previousHtaccess = null, htaccess, redirects, out, prerequisites, mode = 'offline' }) => {
  const problems = [];
  const report = { problems, manifest: null, prerequisites: null, written: [] };
  const redirectsText = fs.existsSync(redirects) ? fs.readFileSync(redirects, 'utf8') : null;
  if (redirectsText === null) { problems.push(`redirect rules ${redirects} missing`); return report; }
  if (!fs.existsSync(htaccess)) { problems.push(`production .htaccess ${htaccess} missing`); return report; }
  const htaccessText = fs.readFileSync(htaccess, 'utf8');
  for (const p of preflight(htaccessText, 'production')) problems.push(`production .htaccess preflight: ${p}`);
  let previousHtaccessText = null;
  if (previousZip) {
    if (!previousHtaccess || !fs.existsSync(previousHtaccess)) problems.push('--previous-zip requires --previous-htaccess: the retained release\'s own .htaccess file (it is not inside the zip)');
    else {
      previousHtaccessText = fs.readFileSync(previousHtaccess, 'utf8');
      // An older release legitimately differs from today's generated config, so only the safety checks apply to it.
      const CURRENT_ONLY = /differs from deterministic generated artifact|does not contain deploy\/apache\/redirects\.htaccess verbatim|RewriteRule count differs/;
      for (const p of preflight(previousHtaccessText, 'production')) if (!CURRENT_ONLY.test(p)) problems.push(`previous .htaccess preflight: ${p}`);
    }
  }
  const forbiddenStrings = loadBaseline().preservationRules.forbiddenBuildStrings;
  for (const [label, z] of [['release', zip], ['previous', previousZip]]) {
    if (!z) continue;
    const r = rehearse({ zip: z, redirects: redirectsText, forbiddenStrings });
    for (const f of r.findings) problems.push(`${label} package [${f.invariant}] ${f.file}: ${f.detail}`);
  }
  if (problems.length) return report;
  const cur = extract(zip);
  const prev = previousZip ? extract(previousZip) : null;
  try {
    const manifest = releaseManifest(cur.siteDir, htaccessText);
    report.manifest = manifest;
    const retained = prev ? { siteDir: prev.siteDir, htaccess: previousHtaccessText, manifest: releaseManifest(prev.siteDir, previousHtaccessText) } : { siteDir: cur.siteDir, htaccess: htaccessText, manifest };
    // "newer" = the other release when a previous one is supplied; otherwise a deliberately different synthetic tree.
    let newer;
    if (prev) newer = { siteDir: cur.siteDir, htaccess: htaccessText, manifest };
    else {
      const synth = fs.mkdtempSync(path.join(os.tmpdir(), 'b162-newer-'));
      cur.synth = synth;
      fs.cpSync(cur.siteDir, synth, { recursive: true });
      fs.writeFileSync(path.join(synth, 'index.html'), `${fs.readFileSync(path.join(cur.siteDir, 'index.html'), 'utf8')}<!-- newer-release-simulation -->\n`);
      fs.writeFileSync(path.join(synth, 'added-by-newer-release.html'), '<!doctype html><title>x</title>\n');
      fs.rmSync(path.join(synth, 'robots.txt'));
      newer = { siteDir: synth, htaccess: `${htaccessText}# newer\n`, manifest: releaseManifest(synth, `${htaccessText}# newer\n`) };
    }
    problems.push(...simulateReinstall({ retained, newer }));
    if (out) {
      fs.rmSync(out, { recursive: true, force: true });
      fs.mkdirSync(out, { recursive: true });
      const put = (name, body) => { fs.writeFileSync(path.join(out, name), body); report.written.push(name); };
      put('release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
      put('SHA256SUMS', sha256sums(manifest));
      put('RESTORE-ORDER.txt', restoreOrderText(manifest));
      fs.copyFileSync(zip, path.join(out, 'bonafide-release.zip'));
      report.written.push('bonafide-release.zip');
      put('production.htaccess', htaccessText);
      put('bonafide-release.zip.sha256', `${sha256(fs.readFileSync(zip))}  bonafide-release.zip\n`);
    }
    return report;
  } finally {
    for (const d of [cur.tmp, prev?.tmp, cur.synth]) if (d) fs.rmSync(d, { recursive: true, force: true });
    const pr = (() => {
      try { return JSON.parse(fs.readFileSync(prerequisites, 'utf8')); } catch (e) { problems.push(`prerequisites file unreadable: ${e.message}`); return null; }
    })();
    const c = checkPrerequisites(pr);
    report.prerequisites = c;
    problems.push(...c.problems);
    if (mode === 'cutover' && c.open.length) problems.push(`cutover mode: ${c.open.length} prerequisite(s) not CONFIRMED: ${c.open.join(', ')}`);
  }
};

const flag = (name) => {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  if (!v || v.startsWith('--')) { console.error(`${name} requires a non-empty value`); process.exit(2); }
  return v;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = flag('--mode') ?? 'offline';
  if (!['offline', 'cutover'].includes(mode)) { console.error('--mode must be offline or cutover'); process.exit(2); }
  const r = prepareRollbackPackage({
    zip: path.resolve(flag('--zip') ?? 'preview-out/bonafide-preview.zip'),
    previousZip: flag('--previous-zip') ? path.resolve(flag('--previous-zip')) : null,
    previousHtaccess: flag('--previous-htaccess') ? path.resolve(flag('--previous-htaccess')) : null,
    htaccess: path.resolve(flag('--htaccess') ?? 'deploy/apache/production.htaccess'),
    redirects: path.resolve(flag('--redirects') ?? 'deploy/apache/redirects.htaccess'),
    out: path.resolve(flag('--out') ?? 'rollback-out'),
    prerequisites: path.resolve(flag('--prerequisites') ?? 'deploy/rollback/prerequisites.json'),
    mode,
  });
  if (r.problems.length) {
    for (const p of r.problems) console.error(`[rollback] ${p}`);
    console.log(`BLOCKED (${mode}): ${r.problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(`PASS (${mode}): ${r.manifest.fileCount} files, ${r.manifest.totalBytes} bytes, tree sha256 ${r.manifest.treeSha256}; wrote ${r.written.join(', ')}`);
  console.log('Reinstall simulation: retained release -> newer release -> retained release reinstalled; tree identical to the retained manifest (throwaway directory).');
  console.log(`Owner rollback prerequisites: ${r.prerequisites.confirmed.length} of ${REQUIRED_PREREQUISITES.length} CONFIRMED with evidence. ${r.prerequisites.open.length ? `NOT READY for cutover, still OPEN: ${r.prerequisites.open.join(', ')}` : 'All confirmed.'}`);
  console.log('No real WordPress backup was read, assumed or restored; no rollback has been executed on any host.');
}
