// Block 54 (Issue #124): package a built dist/ into a LOCAL-ONLY owner preview zip.
// Runs the existing release-artifact preflight first; refuses to package a dist/ that has findings.
// Writes nothing inside dist/, contacts no network, deploys nothing, and changes no site content.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildManifest, scanArtifact } from './check-release-artifact.mjs';
import { loadBaseline } from '../src/lib/data.mjs';

export const PREVIEW_NOTICE =
  'LOCAL PREVIEW ONLY. Not a deployment, not production QA clearance (strict migration QA keeps its open findings). '
  + 'Page content, canonical URLs and noindex state are exactly those of the build.';

export const packagePreview = ({ dist = 'dist', out = 'preview-out', commit = 'unknown' } = {}) => {
  const distDir = path.resolve(dist);
  if (!fs.existsSync(path.join(distDir, 'index.html'))) throw new Error(`${distDir}/index.html missing — run \`npm run build\` first`);
  const findings = scanArtifact(distDir, loadBaseline().preservationRules.forbiddenBuildStrings);
  if (findings.length) throw new Error(`preflight findings, refusing to package:\n${findings.map((f) => `[${f.rule}] ${f.file}: ${f.detail}`).join('\n')}`);
  const manifest = buildManifest(distDir);
  const outDir = path.resolve(out);
  const root = path.join(outDir, 'bonafide-preview');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  fs.cpSync(distDir, path.join(root, 'site'), { recursive: true });
  for (const f of ['Open-Preview.command', 'READ-ME-FIRST.txt']) {
    const dest = path.join(root, f);
    fs.copyFileSync(path.join(import.meta.dirname, 'preview', f), dest);
    if (f.endsWith('.command')) fs.chmodSync(dest, 0o755);
  }
  fs.writeFileSync(path.join(root, 'PREVIEW-INFO.json'), `${JSON.stringify({
    notice: PREVIEW_NOTICE, commit, fileCount: manifest.fileCount, treeSha256: manifest.treeSha256,
  }, null, 2)}\n`);
  const zip = path.join(outDir, 'bonafide-preview.zip');
  const r = spawnSync('zip', ['-X', '-r', '-q', zip, 'bonafide-preview'], { cwd: outDir, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`zip failed: ${r.stderr || r.error}`);
  return { zip, root, manifest };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { zip, manifest } = packagePreview({ commit: process.env.GITHUB_SHA ?? 'local' });
    console.log(`OK: ${zip} (${manifest.fileCount} site files, tree sha256 ${manifest.treeSha256})`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
