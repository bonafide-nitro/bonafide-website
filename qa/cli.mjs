// Usage: node qa/cli.mjs [--mode foundation|strict] [--dist dist] [--json report.json]
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { loadBaseline, loadRedirects, loadSite } from '../src/lib/data.mjs';
import { runQa, CHECK_MAP, INV } from './checks.mjs';

export const loadInputs = () => {
  const baseline = loadBaseline();
  let redirects; let redirectSchemaError;
  try { redirects = loadRedirects(); } catch (e) {
    redirectSchemaError = String(e.message).slice(0, 500);
    redirects = YAML.parse(fs.readFileSync(path.resolve('src/data/redirects.yaml'), 'utf8')).rules;
  }
  const config = JSON.parse(fs.readFileSync(path.resolve('qa/qa.config.json'), 'utf8'));
  const astroConfig = fs.readFileSync(path.resolve('astro.config.mjs'), 'utf8');
  return { baseline, redirects, redirectSchemaError, site: loadSite(), config, astroConfig };
};

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : dflt; };

export const formatReport = (r) => {
  const out = [];
  const group = (list) => {
    const byKey = new Map();
    for (const f of list) byKey.set(`${f.check} ${f.code}`, [...(byKey.get(`${f.check} ${f.code}`) ?? []), f]);
    for (const [key, fs_] of [...byKey].sort()) {
      out.push(`  [${key}] x${fs_.length}`);
      for (const f of fs_.slice(0, 40)) out.push(`      ${f.path ?? '-'}: ${f.message}${f.from.length ? ` (from ${f.from.slice(0, 3).join(', ')}${f.from.length > 3 ? `, +${f.from.length - 3}` : ''})` : ''}`);
      if (fs_.length > 40) out.push(`      … ${fs_.length - 40} more`);
    }
  };
  out.push(`QA mode: ${r.mode}   built pages: ${r.stats.pagesBuilt}   protected URLs built: ${r.stats.protectedBuilt}/${r.stats.protectedUrls}`);
  const inv = r.findings.filter((f) => f.kind === INV);
  if (inv.length) { out.push(`\nREGRESSIONS / INVARIANT FAILURES (${inv.length}) — blocking in every mode:`); group(inv); }
  if (r.migrationRemaining.length) {
    out.push(`\nMIGRATION WORK REMAINING (${r.migrationRemaining.length}) — ${r.mode === 'strict' ? 'BLOCKING in strict mode' : 'reported, non-blocking in foundation mode only'}:`);
    group(r.migrationRemaining);
  }
  out.push('');
  if (r.mode === 'foundation') {
    out.push(r.passed ? 'FOUNDATION QA: PASS (machinery, invariants and present routes are sound).' : 'FOUNDATION QA: FAIL.');
    out.push(r.strictWouldPass ? 'Strict migration mode would PASS.' : `MIGRATION IS NOT COMPLETE: strict mode would FAIL with ${r.findings.length} finding(s) (${r.migrationRemaining.length} migration-remaining, ${inv.length} invariant).`);
  } else out.push(r.passed ? 'STRICT MIGRATION QA: PASS.' : `STRICT MIGRATION QA: FAIL (${r.blocking.length} blocking finding(s)).`);
  return out.join('\n');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = arg('--mode', 'foundation');
  if (!['foundation', 'strict'].includes(mode)) { console.error('--mode must be "foundation" or "strict"'); process.exit(2); }
  const dist = path.resolve(arg('--dist', 'dist'));
  if (!fs.existsSync(dist)) { console.error(`${dist} missing — run \`npm run build\` first`); process.exit(2); }
  const result = runQa({ distDir: dist, mode, ...loadInputs() });
  console.log(formatReport(result));
  const jsonOut = arg('--json');
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ ...result, checks: CHECK_MAP }, null, 2));
  process.exit(result.passed ? 0 : 1);
}
