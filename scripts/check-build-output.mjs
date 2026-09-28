// Fails if any forbidden string appears anywhere in the built output (dist/).
import fs from 'node:fs';
import path from 'node:path';
import { loadBaseline } from '../src/lib/data.mjs';

export const findForbidden = (dir, needles) => {
  const hits = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        const text = fs.readFileSync(p).toString('latin1').toLowerCase();
        for (const n of needles) if (text.includes(n.toLowerCase())) hits.push(`${p}: ${n}`);
      }
    }
  };
  walk(dir);
  return hits;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = path.resolve('dist');
  if (!fs.existsSync(dist)) { console.error('dist/ missing — run `npm run build` first'); process.exit(2); }
  const hits = findForbidden(dist, loadBaseline().preservationRules.forbiddenBuildStrings);
  if (hits.length) { console.error(hits.join('\n')); process.exit(1); }
  console.log('dist/ clean: no forbidden strings');
}
