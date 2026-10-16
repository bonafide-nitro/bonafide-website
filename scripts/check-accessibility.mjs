// Build-level accessibility/functional-HTML gate over every generated .html file in dist/ (see qa/lib/a11y.mjs).
// Exit 1 on any finding. There is no allowlist: a defect is fixed in the source, not suppressed here.
import fs from 'node:fs';
import path from 'node:path';
import { auditHtml } from '../qa/lib/a11y.mjs';

export const checkDist = (dir) => {
  const results = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) {
        const rel = '/' + path.relative(dir, p).split(path.sep).join('/');
        for (const f of auditHtml(fs.readFileSync(p, 'utf8'))) results.push({ file: rel, ...f });
      }
    }
  };
  walk(dir);
  return { results };
};

export const countHtml = (dir) => {
  let n = 0;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) n++; } };
  walk(dir);
  return n;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = path.resolve('dist');
  if (!fs.existsSync(dist)) { console.error('dist/ missing — run `npm run build` first'); process.exit(2); }
  const total = countHtml(dist);
  const { results } = checkDist(dist);
  if (results.length) {
    for (const r of results) console.error(`${r.file}: [${r.code}] ${r.message}`);
    console.error(`accessibility check FAILED: ${results.length} finding(s) across ${total} HTML file(s)`);
    process.exit(1);
  }
  console.log(`accessibility check passed: ${total} HTML file(s), no structural defects`);
}
