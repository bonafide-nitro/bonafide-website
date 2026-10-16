// Block 59 (Issue #135): offline Apache config artifacts for the static docroot, plus a fail-closed preflight.
//
//   node scripts/build-apache-config.mjs                     write deploy/apache/production.htaccess and staging-overlay.htaccess.template
//   node scripts/build-apache-config.mjs --check             fail if either committed artifact is missing/stale or the pair violates separation
//   node scripts/build-apache-config.mjs --preflight <file> --target production|staging [--docroot <abs path>]
//                                                            (staging requires --docroot) validate a candidate config (e.g. a staging overlay a human completed); never writes
//   node scripts/build-apache-config.mjs --gates             print the open host/human inputs that no repo check can answer
//
// Output is a pure function of deploy/apache/redirects.htaccess (itself generated from src/data/redirects.yaml). Nothing here
// deploys anything, writes to a docroot, contacts a host, or contains a credential, password file path, or staging host name.
// Host capabilities (mod_rewrite/mod_headers/mod_mime availability, AllowOverride, symlinked or custom docroot = decision D1)
// are UNVERIFIED and are treated as gates, never assumed.
import fs from 'node:fs';
import path from 'node:path';
import { renderHtaccess, ARTIFACT_PATH as REDIRECTS_PATH } from './build-htaccess.mjs';

export const PRODUCTION_PATH = 'deploy/apache/production.htaccess';
export const STAGING_OVERLAY_PATH = 'deploy/apache/staging-overlay.htaccess.template';
export const NOINDEX_VALUE = 'noindex, nofollow';
export const PLACEHOLDER_AUTH_FILE = '@@STAGING_AUTH_USER_FILE_ABSOLUTE_PATH@@';
export const PLACEHOLDER_AUTH_REALM = '@@STAGING_AUTH_REALM@@';

// Types a static Astro build + retained WordPress uploads need; mod_mime is guarded so an absent module is a no-op, not a 500.
const MIME_TYPES = [
  ['application/xml', '.xml'], ['text/plain', '.txt'], ['application/manifest+json', '.webmanifest'],
  ['image/webp', '.webp'], ['image/avif', '.avif'], ['image/svg+xml', '.svg'], ['font/woff2', '.woff2'], ['font/woff', '.woff'],
];

export const renderProduction = (redirects = renderHtaccess()) => {
  const out = [
    '# GENERATED FILE - DO NOT EDIT. Source: scripts/build-apache-config.mjs (composes deploy/apache/redirects.htaccess).',
    '# PRODUCTION static-docroot .htaccess candidate. Offline artifact only: nothing here has been installed or tested on any host.',
    '# It must never contain staging protection (auth, X-Robots-Tag, noindex): the static pages are deliberately indexable.',
    '# Unverified host gates (see docs/migration/51-block59-apache-config.md): mod_rewrite, mod_mime, AllowOverride FileInfo,',
    '# docroot model (D1), who installs this file. Hand-editing the server .htaccess is forbidden (master plan 10.4).',
    '',
    '# --- 404: real status from the local static page (a local path keeps the 404 status; a URL would turn it into a 302) ---',
    'ErrorDocument 404 /404.html',
    '',
    '# --- MIME types for static output (guarded: absent mod_mime is a no-op) ---',
    '<IfModule mod_mime.c>',
    ...MIME_TYPES.map(([t, e]) => `AddType ${t} ${e}`),
    '</IfModule>',
    '',
    '# --- Historical 301 redirects + protocol/host canonicalisation: deploy/apache/redirects.htaccess, verbatim ---',
    '# BEGIN redirects.htaccess',
    redirects.replace(/\n$/, ''),
    '# END redirects.htaccess',
    '',
  ];
  return out.join('\n');
};

// Staging-only. Deliberately a TEMPLATE: the credentials file and realm are human-supplied and have no default.
// Fail closed: if mod_headers is missing the noindex header cannot be enforced, so deny everything instead of serving indexable staging.
export const renderStagingOverlay = () => [
  '# GENERATED FILE - DO NOT EDIT. Source: scripts/build-apache-config.mjs.',
  '# STAGING-ONLY overlay TEMPLATE. Never include this in, or merge it into, the production artifact.',
  '# Not usable until a human supplies the two @@...@@ values below (an absolute path OUTSIDE the docroot to an htpasswd file the',
  '# human created; its contents and name are never stored in this repository). `--preflight --target staging` rejects it while any placeholder remains.',
  '',
  '<IfModule !mod_headers.c>',
  '  # noindex cannot be enforced without mod_headers: fail closed.',
  '  Require all denied',
  '</IfModule>',
  '<IfModule mod_headers.c>',
  `  Header always set X-Robots-Tag "${NOINDEX_VALUE}"`,
  '  # Authentication lives only in this branch: uncontained Require lines are OR-ed (implicit RequireAny), so a',
  '  # valid-user outside it would override the denial above and serve staging without X-Robots-Tag.',
  '  AuthType Basic',
  `  AuthName "${PLACEHOLDER_AUTH_REALM}"`,
  `  AuthUserFile ${PLACEHOLDER_AUTH_FILE}`,
  '  Require valid-user',
  '</IfModule>',
  '',
].join('\n');

const lines = (text) => text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const countRules = (text) => lines(text).filter((l) => /^RewriteRule\s/i.test(l)).length;

// Returns a list of blocking problems ([] = pass). Pure over the candidate text.
export const preflight = (text, target, { docroot } = {}) => {
  const problems = [];
  const eff = lines(text);
  const has = (re) => eff.some((l) => re.test(l));
  if (text.includes('\r')) problems.push('CRLF line endings');
  if (/AuthUserFile\s+\/[^\s]*(?:public_html|htdocs|www)\b/i.test(text)) problems.push('AuthUserFile inside a web docroot');
  if (target === 'staging') {
    // Resolved containment against the ACTUAL staging docroot (human-supplied), not just conventional directory names.
    const real = (p) => { const r = path.resolve(p); try { return fs.realpathSync(r); } catch { return r; } };
    const inside = (child, parent) => { const rel = path.relative(real(parent), real(child)); return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel)); };
    const authFiles = eff.map((l) => l.match(/^AuthUserFile\s+(\/\S+)$/i)).filter(Boolean).map((m) => m[1]);
    if (!docroot) problems.push('staging docroot not supplied (--docroot <absolute path>): cannot verify AuthUserFile is outside it');
    else if (!path.isAbsolute(docroot)) problems.push('--docroot must be an absolute path');
    else if (authFiles.some((f) => inside(f, docroot))) problems.push('AuthUserFile resolves inside the staging docroot');
  }
  if (target === 'production') {
    if (has(/x-robots-tag/i) || has(/noindex/i)) problems.push('staging noindex/X-Robots-Tag present in production config');
    if (has(/^Auth(Type|Name|UserFile|BasicProvider)\b/i) || has(/^Require\s+(valid-user|user|group|all denied)/i)) problems.push('staging auth/access directive present in production config');
    if (eff.some((l) => l.includes('@@'))) problems.push('unresolved @@placeholder@@ in production config');
    if (/htpasswd/i.test(text)) problems.push('htpasswd reference in production config');
    if (!eff.some((l) => /^ErrorDocument\s+404\s+/i.test(l) && /\s\/404\.html$/.test(l))) problems.push('missing local "ErrorDocument 404 /404.html"');
    if (has(/^ErrorDocument\s+404\s+(https?:|")/i) || has(/^ErrorDocument\s+404\s+\/(?!404\.html$)\S+/i)) problems.push('404 ErrorDocument is not the local /404.html (external URL would 302; other paths would hide the 404)');
    if (has(/^ErrorDocument\s+(?!404\b)/i)) problems.push('unexpected ErrorDocument for a status other than 404');
    if (has(/^RewriteRule\s+\S+\s+\S+\s+\[[^\]]*R=30[2378]/i)) problems.push('non-301 redirect');
    if (has(/^(Redirect|RedirectMatch)\b/i)) problems.push('mod_alias Redirect used; redirects must come from the generated mod_rewrite rules');
    if (has(/^RewriteRule\s+\^?\.\*\$?\s+\S*index\.html/i) || has(/^FallbackResource\b/i)) problems.push('catch-all/fallback routing would turn unknown URLs into 200s');
    if (has(/^RewriteRule\s+\^?wp-content\/uploads/i)) problems.push('rule touches retained /wp-content/uploads/ paths');
    if (has(/^php_|^AddHandler|^SetHandler|^AddType\s+application\/x-httpd-php/i)) problems.push('PHP handler directive in static production config');
    const redirects = fs.existsSync(REDIRECTS_PATH) ? fs.readFileSync(REDIRECTS_PATH, 'utf8') : null;
    if (redirects === null) problems.push(`${REDIRECTS_PATH} missing`);
    else {
      if (!text.includes(redirects.replace(/\n$/, ''))) problems.push('does not contain deploy/apache/redirects.htaccess verbatim');
      if (countRules(text) !== countRules(redirects)) problems.push('RewriteRule count differs from the generated redirects');
    }
  } else if (target === 'staging') {
    if (eff.some((l) => l.includes('@@'))) problems.push('unresolved @@placeholder@@: human-supplied auth realm/credentials-file path is missing');
    if (!has(/^Header\s+always\s+set\s+X-Robots-Tag\s+"noindex, nofollow"$/i)) problems.push('missing server-enforced X-Robots-Tag: noindex, nofollow');
    if (!has(/^AuthType\s+Basic$/i) || !has(/^AuthName\s+"[^"]+"$/) || !has(/^AuthUserFile\s+\/\S+$/) || !has(/^Require\s+valid-user$/i)) problems.push('HTTP Basic authentication incomplete (AuthType, AuthName, absolute AuthUserFile, Require valid-user)');
    if (!has(/^<IfModule !mod_headers\.c>$/i) || !has(/^Require all denied$/i)) problems.push('missing fail-closed branch for absent mod_headers');
    // Closed allowlist: any other effective directive (Require all granted, Header unset/append, Satisfy, ...) could re-open access
    // or strip the noindex header, because uncontained Require lines are OR-ed and header directives apply in order.
    const stack = [];
    for (const l of eff) {
      const open = l.match(/^<IfModule\s+(!?mod_\w+\.c)>$/i);
      if (open) { stack.push(open[1].toLowerCase()); continue; }
      if (/^<\/IfModule>$/i.test(l)) { stack.pop(); continue; }
      const top = stack[stack.length - 1];
      if (/^Require\s+valid-user$/i.test(l)) { if (top !== 'mod_headers.c') problems.push('Require valid-user outside the mod_headers branch: it would override the fail-closed denial'); continue; }
      if (/^Require\s+all\s+denied$/i.test(l)) { if (top !== '!mod_headers.c') problems.push('Require all denied outside the !mod_headers branch'); continue; }
      if (/^Header\s+always\s+set\s+X-Robots-Tag\s+"noindex, nofollow"$/i.test(l)) { if (top !== 'mod_headers.c') problems.push('X-Robots-Tag set outside the mod_headers branch'); continue; }
      if (/^(AuthType\s+Basic|AuthName\s+"[^"]+"|AuthUserFile\s+\/\S+)$/i.test(l) || l.includes('@@')) continue;
      problems.push(`unexpected directive in staging overlay (only the documented auth/noindex/fail-closed lines are allowed): ${l}`);
    }
  } else problems.push(`unknown target "${target}" (production|staging)`);
  return problems;
};

export const OPEN_GATES = [
  'D1: GoDaddy/cPanel permits a symlinked docroot or custom document root (else Model A-prime rsync); undecided',
  'Apache modules on the host: mod_rewrite, mod_mime, mod_headers (staging noindex) available',
  'AllowOverride on the docroot permits FileInfo (rewrite/ErrorDocument/AddType) and AuthConfig (staging auth) in .htaccess',
  'Who installs the composed production .htaccess (hand-editing the server file is forbidden)',
  'Staging host name, its owner, and a human-created htpasswd file outside the docroot (no secrets in GitHub)',
  'Real 404 status, MIME types, one-hop redirects and trailing-slash 301 observed on the staging host (master plan 14 step 9, T12/T13)',
];

export const renderAll = () => ({ [PRODUCTION_PATH]: renderProduction(), [STAGING_OVERLAY_PATH]: renderStagingOverlay() });

// Production and the overlay must stay disjoint in content as well as in file.
export const separationProblems = (files = renderAll()) => {
  const p = [];
  const prod = files[PRODUCTION_PATH]; const stg = files[STAGING_OVERLAY_PATH];
  p.push(...preflight(prod, 'production').map((x) => `production: ${x}`));
  if (!stg.includes('@@')) p.push('staging overlay template must keep its human-input placeholders');
  if (prod.includes('<IfModule !mod_headers.c>') || prod.includes(stg.split('\n').find((l) => l.startsWith('AuthUserFile')))) p.push('staging content leaked into production');
  return p;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const fail = (m) => { console.error(m); process.exit(1); };
  if (argv.includes('--gates')) { OPEN_GATES.forEach((g) => console.log(`OPEN GATE: ${g}`)); }
  else if (argv.includes('--preflight')) {
    const file = argv[argv.indexOf('--preflight') + 1]; const target = argv[argv.indexOf('--target') + 1];
    if (!file || !target || !fs.existsSync(file)) fail('usage: --preflight <existing file> --target production|staging');
    const di = argv.indexOf('--docroot'); const docroot = di >= 0 ? argv[di + 1] : undefined;
    const problems = preflight(fs.readFileSync(file, 'utf8'), target, { docroot });
    if (problems.length) fail(`preflight BLOCKED (${target}):\n- ${problems.join('\n- ')}`);
    console.log(`preflight ok (${target}); host gates remain open: run --gates`);
  } else {
    const files = renderAll();
    if (argv.includes('--check')) {
      const stale = Object.entries(files).filter(([f, t]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== t).map(([f]) => f);
      if (stale.length) fail(`missing or stale: ${stale.join(', ')}: run node scripts/build-apache-config.mjs`);
      const sep = separationProblems(files);
      if (sep.length) fail(`staging/production separation violated:\n- ${sep.join('\n- ')}`);
      console.log('deploy/apache config artifacts are up to date and separated');
    } else {
      for (const [f, t] of Object.entries(files)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); console.log(`wrote ${f}`); }
    }
  }
}
