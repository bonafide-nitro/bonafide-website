// Issue #162: executable offline end-to-end Apache rehearsal.
// Serves the PACKAGED production build (the extracted release zip) from a throwaway docroot under a real,
// unprivileged Apache bound to 127.0.0.1, with deploy/apache/production.htaccess installed as the docroot
// .htaccess, then asserts what a crawler or visitor would see. It reuses the existing zip rehearsal (Block 62)
// and the Apache preflight (Block 59); it does not reimplement them. No network beyond loopback, no host
// access, no credentials. PASS proves nothing about the real host's modules, AllowOverride, docroot model,
// TLS or CDN: those stay in the go/no-go table (docs/migration/56-block162-release-path-go-no-go.md).
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { rehearse, PACKAGE_ROOT } from './rehearse-release.mjs';
import { preflight } from './build-apache-config.mjs';
import { walkTree } from './check-release-artifact.mjs';
import { loadBaseline } from '../src/lib/data.mjs';

export const ORIGIN = 'https://bonafidenitro.com';
const MODULE_DIRS = ['/usr/lib/apache2/modules', '/usr/lib64/httpd/modules', '/usr/local/apache2/modules', '/opt/homebrew/opt/httpd/lib/httpd/modules'];
const BIN_NAMES = ['apache2', 'httpd'];
const MIME_TYPES_FILES = ['/etc/mime.types', '/etc/apache2/mime.types', '/usr/local/apache2/conf/mime.types'];
// Types the host's stock mime.types is expected to cover; production.htaccess adds the rest (xml, txt, webp, avif, svg, fonts).
const EXPECTED_TYPE = {
  '.html': /^text\/html/, '.css': /^text\/css/, '.js': /^(?:text|application)\/(?:javascript|x-javascript)/,
  '.json': /^application\/json/, '.xml': /^application\/xml/, '.txt': /^text\/plain/, '.webmanifest': /^application\/manifest\+json/,
  '.png': /^image\/png/, '.jpg': /^image\/jpeg/, '.jpeg': /^image\/jpeg/, '.gif': /^image\/gif/, '.webp': /^image\/webp/,
  '.avif': /^image\/avif/, '.svg': /^image\/svg\+xml/, '.ico': /^image\/(?:x-icon|vnd\.microsoft\.icon)/,
  '.woff2': /^font\/woff2/, '.woff': /^font\/woff(?!2)/, '.pdf': /^application\/pdf/,
};
// Critical public paths named by Issue #162, each with a content assertion on the served bytes.
export const CRITICAL_PAGES = [
  { id: 'home', path: '/', title: /nitro/i },
  { id: 'retail', path: '/products/', canonical: true },
  { id: 'how-to-buy', path: '/howtobuy/', canonical: true },
  { id: 'wholesale', path: '/interested-in-selling-usa/', canonical: true },
  { id: 'wholesale-kegs', path: '/nitro-coffee-kegs/', canonical: true },
  { id: 'blog-index', path: '/blog/', canonical: true },
  { id: 'blog-article', path: '/coffee-on-tap-is-the-future/', canonical: true },
  { id: 'contact', path: '/contact-bona-fide-nitro-coffee-and-tea/', canonical: true, includes: ['mailto:contact@bonafidenitro.com'] },
  { id: 'booking-disabled', path: '/book-appointment/', canonical: true, includes: ['aria-disabled="true"'], noindex: true, excludes: ['calendly.com'] },
];

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };

export const findApache = (env = process.env) => {
  const bin = env.APACHE_BIN || BIN_NAMES.flatMap((n) => ['/usr/sbin', '/usr/bin', '/usr/local/apache2/bin', '/opt/homebrew/bin']
    .map((d) => path.join(d, n))).find(isFile) || BIN_NAMES.map((n) => spawnSync('which', [n], { encoding: 'utf8' }).stdout.trim()).find(Boolean);
  if (!bin || !isFile(bin)) return { error: 'no apache2/httpd binary found (set APACHE_BIN)' };
  const modules = env.APACHE_MODULES_DIR || MODULE_DIRS.find((d) => isFile(path.join(d, 'mod_rewrite.so')));
  if (!modules) return { error: 'Apache modules directory with mod_rewrite.so not found (set APACHE_MODULES_DIR)' };
  const v = spawnSync(bin, ['-v'], { encoding: 'utf8' });
  return { bin, modules, version: (v.stdout.match(/Apache\/[\d.]+/) ?? ['unknown'])[0] };
};

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

const request = ({ scheme = 'https', host = 'bonafidenitro.com', pathname, ports }) => new Promise((resolve, reject) => {
  const lib = scheme === 'https' ? https : http;
  const req = lib.request({
    host: '127.0.0.1', port: scheme === 'https' ? ports.https : ports.http, path: pathname, method: 'GET', agent: false,
    headers: { Host: host, 'Accept-Encoding': 'identity', Connection: 'close' }, rejectUnauthorized: false, servername: 'bonafidenitro.com',
  }, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.setTimeout(10000, () => req.destroy(new Error('request timed out')));
  req.on('error', reject);
  req.end();
});

// Parse deploy/apache/redirects.htaccess into rules with the RewriteConds that precede each.
export const parseRules = (text) => {
  const rules = [];
  let conds = [];
  let name = null;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('# ') && !t.includes(' ')) name = t.slice(2);
    else if (/^# [a-z0-9][a-z0-9-]*$/.test(t)) name = t.slice(2);
    const cond = t.match(/^RewriteCond\s+(\S+)\s+(\S+)/);
    if (cond) { conds.push({ test: cond[1], pattern: cond[2] }); continue; }
    const rule = t.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?/);
    if (rule) { rules.push({ name, pattern: rule[1], dest: rule[2], flags: (rule[3] ?? '').split(','), conds }); conds = []; }
  }
  return rules;
};
export const declaredRuleCount = (text) => Number((text.match(/^# Rules:\s*(\d+)/m) ?? [])[1] ?? NaN);

const sourceFor = (pattern) => {
  const p = pattern.replace(/^\^/, '').replace(/\$$/, '').replace(/\(\[\^\/\]\+\)/g, 'rehearsal-sample').replace(/\\(.)/g, '$1');
  return `/${p}`;
};

// Modules compiled into the binary (`apache2 -l`) must not be LoadModule'd again.
const builtIn = (bin) => new Set([...spawnSync(bin, ['-l'], { encoding: 'utf8' }).stdout.matchAll(/^\s*(mod_\w+\.c)/gm)].map((m) => m[1]));

const apacheConf = ({ root, docroot, ports, bin, modules, mimeFile, cert, key }) => {
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  const mods = ['mpm_event', 'authz_core', 'unixd', 'log_config', 'mime', 'dir', 'rewrite', 'headers', 'ssl'];
  return [
    `ServerRoot "${root}"`, 'ServerName bonafidenitro.com', `PidFile "${root}/apache.pid"`, `DefaultRuntimeDir "${root}/run"`,
    `Mutex file:${root}/mutex default`, `ErrorLog "${root}/error.log"`, 'LogLevel warn', 'ServerTokens Prod',
    ...(isRoot ? ['User nobody', `Group ${spawnSync('id', ['-gn', 'nobody'], { encoding: 'utf8' }).stdout.trim() || 'nogroup'}`] : []),
    ...mods.filter((m) => !builtIn(bin).has(`mod_${m}.c`)).map((m) => `LoadModule ${m}_module "${modules}/mod_${m}.so"`),
    mimeFile ? `TypesConfig "${mimeFile}"` : 'AddType text/html .html\nAddType text/css .css\nAddType application/javascript .js\nAddType image/png .png\nAddType image/jpeg .jpg .jpeg\nAddType image/gif .gif\nAddType image/x-icon .ico\nAddType application/pdf .pdf\nAddType application/json .json',
    `Listen 127.0.0.1:${ports.http}`, `Listen 127.0.0.1:${ports.https}`,
    'SSLProtocol all -SSLv3', 'SSLSessionCache none',
    '<Directory />\n  AllowOverride None\n  Require all denied\n</Directory>',
    '<FilesMatch "^\\.ht">\n  Require all denied\n</FilesMatch>',
    `<Directory "${docroot}">\n  Options FollowSymLinks\n  AllowOverride All\n  Require all granted\n  DirectoryIndex index.html\n</Directory>`,
    `<VirtualHost 127.0.0.1:${ports.http}>\n  ServerName bonafidenitro.com\n  ServerAlias www.bonafidenitro.com\n  DocumentRoot "${docroot}"\n</VirtualHost>`,
    `<VirtualHost 127.0.0.1:${ports.https}>\n  ServerName bonafidenitro.com\n  ServerAlias www.bonafidenitro.com\n  DocumentRoot "${docroot}"\n  SSLEngine on\n  SSLCertificateFile "${cert}"\n  SSLCertificateKeyFile "${key}"\n</VirtualHost>`,
    '',
  ].join('\n');
};

const waitForPort = async (port, ms = 10000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const ok = await new Promise((r) => { const s = net.connect(port, '127.0.0.1', () => { s.destroy(); r(true); }); s.on('error', () => r(false)); });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
};

const canonicalOf = (html) => (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0].match(/href=["']([^"']*)["']/i) ?? [])[1] ?? null;
const localRefs = (html) => [...new Set([...html.matchAll(/\b(?:src|href)=["'](\/(?!\/)[^"'#?]*)/gi)].map((m) => m[1]))];
const decodePath = (p) => { try { return decodeURI(p); } catch { return p; } };
const fileForUrl = (siteDir, urlPath) => {
  const rel = decodePath(urlPath).replace(/^\//, '');
  const candidates = urlPath.endsWith('/') ? [path.join(rel, 'index.html')] : [rel];
  return candidates.map((c) => path.join(siteDir, c)).find(isFile) ?? null;
};

// Runs every assertion against a live loopback Apache serving `siteDir` with `htaccessText` installed.
export const runAssertions = async ({ siteDir, ports, redirectsText, expectedHtaccess = null }) => {
  const results = [];
  const check = (id, ok, detail) => results.push({ id, ok: Boolean(ok), detail });
  const get = (pathname, o = {}) => request({ pathname, ports, ...o });
  // .htaccess is the installed config (never packaged; asserted 403 below). .gitkeep is an empty placeholder that
  // check:artifact deliberately allows; it is still served and compared, only the MIME rule is skipped.
  const manifestFiles = walkTree(siteDir).files.filter((f) => f !== '.htaccess');

  // A. legacy redirects: every generated rule, derived from the same redirects.htaccess the host receives.
  const rules = parseRules(redirectsText);
  const declared = declaredRuleCount(redirectsText);
  check('A0-rule-count', rules.length === declared && declared > 0, `parsed ${rules.length} RewriteRule(s), header declares ${declared}`);
  const isProtocol = (r) => r.conds.some((c) => /%\{(?:HTTPS|HTTP_HOST)\}/.test(c.test));
  const pathRules = rules.filter((r) => !isProtocol(r));
  const protocolRules = rules.filter(isProtocol);
  check('A0-protocol-rules', protocolRules.length === 3, `${protocolRules.length} protocol/host rule(s) (expected http-apex, http-www, https-www)`);
  for (const r of pathRules) {
    const src = sourceFor(r.pattern);
    const qcond = r.conds.find((c) => c.test === '%{QUERY_STRING}');
    const qs = qcond ? `${qcond.pattern.replace(/^\^/, '')}rehearsal=1` : (r.flags.includes('QSD') ? 'utm_source=rehearsal' : '');
    const expected = r.dest.replace('$1', 'rehearsal-sample').replace(/\?$/, '');
    const res = await get(qs ? `${src}?${qs}` : src);
    const loc = res.headers.location ?? '';
    check(`A1-redirect:${r.name}`, res.status === 301 && loc === expected, `GET ${src}${qs ? `?${qs}` : ''} -> ${res.status} ${loc || '(no Location)'} (expected 301 ${expected})`);
    if (expected.startsWith(`${ORIGIN}/`) && res.status === 301 && !r.dest.includes('$1')) { // pattern rules have no single destination file
      const hop = await get(expected.slice(ORIGIN.length));
      check(`A2-one-hop:${r.name}`, hop.status === 200, `destination ${expected} -> ${hop.status} (expected 200, no second redirect)`);
    }
  }
  const proto = [
    ['http apex', { scheme: 'http', host: 'bonafidenitro.com' }],
    ['http www', { scheme: 'http', host: 'www.bonafidenitro.com' }],
    ['https www', { scheme: 'https', host: 'www.bonafidenitro.com' }],
  ];
  for (const [label, o] of proto) {
    const res = await get('/products/?a=b', o);
    check(`A3-canonical-host:${label}`, res.status === 301 && res.headers.location === `${ORIGIN}/products/?a=b`, `${label} /products/?a=b -> ${res.status} ${res.headers.location ?? '(no Location)'}`);
  }
  const canonical = await get('/products/', { scheme: 'https', host: 'bonafidenitro.com' });
  check('A3-canonical-host:https apex stays', canonical.status === 200, `https apex /products/ -> ${canonical.status} (no redirect loop)`);

  // B. trailing slash, index, and deep routes.
  const dirs = manifestFiles.filter((f) => f.endsWith('/index.html') && f !== 'index.html').map((f) => f.slice(0, -'index.html'.length));
  for (const d of dirs) {
    const bare = `/${d.slice(0, -1)}`;
    const res = await get(bare);
    let loc = null;
    try { loc = res.headers.location ? new URL(res.headers.location) : null; } catch { loc = null; }
    check(`B1-trailing-slash:${bare}`, res.status === 301 && loc?.pathname === `/${d}` && loc.hostname === 'bonafidenitro.com', `GET ${bare} -> ${res.status} ${res.headers.location ?? '(no Location)'}`);
  }
  const home = await get('/');
  check('B2-index:/', home.status === 200 && /^text\/html/.test(home.headers['content-type'] ?? ''), `GET / -> ${home.status} ${home.headers['content-type']}`);
  check('B2-index:/index.html', (await get('/index.html')).status === 200, 'GET /index.html -> 200');

  // C. every shipped file is served, byte-identical, with the expected MIME type; no staging/auth leakage anywhere.
  const leaks = [];
  for (const rel of manifestFiles) {
    const urlPath = rel.endsWith('index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel.split('/').map(encodeURIComponent).join('/')}`;
    const res = await get(urlPath);
    const want = sha256(fs.readFileSync(path.join(siteDir, rel)));
    check(`C1-served:${rel}`, res.status === 200 && sha256(res.body) === want, `GET ${urlPath} -> ${res.status}, body ${sha256(res.body) === want ? 'identical' : 'DIFFERS from packaged file'}`);
    const ext = path.extname(rel).toLowerCase();
    if (path.basename(rel) === '.gitkeep') check(`C2-mime:${rel}`, res.body.length === 0, 'empty placeholder file allowed by check:artifact');
    else if (EXPECTED_TYPE[ext]) check(`C2-mime:${rel}`, EXPECTED_TYPE[ext].test(res.headers['content-type'] ?? ''), `${ext} -> ${res.headers['content-type']}`);
    else check(`C2-mime:${rel}`, false, `no expected MIME rule for ${ext}; extend EXPECTED_TYPE deliberately`);
    for (const h of ['x-robots-tag', 'www-authenticate']) if (res.headers[h]) leaks.push(`${urlPath} sends ${h}: ${res.headers[h]}`);
  }

  // D. 404 behaviour and probes that must not exist.
  const notFound = await get('/no-such-page-rehearsal/');
  const page404 = fs.readFileSync(path.join(siteDir, '404.html'));
  check('D1-404-status-and-body', notFound.status === 404 && notFound.body.equals(page404), `GET /no-such-page-rehearsal/ -> ${notFound.status}, body ${notFound.body.equals(page404) ? 'is 404.html' : 'is NOT 404.html'}`);
  check('D2-404-noindex', /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(page404.toString('utf8')), '404.html carries robots noindex');
  for (const p of ['/wp-login.php', '/wp-admin/', '/xmlrpc.php', '/wp-json/', '/wp-content/plugins/', '/.htaccess', '/.htpasswd', '/.git/config', '/wp-config.php']) {
    const res = await get(p);
    check(`D3-absent:${p}`, [403, 404].includes(res.status) && !/<\?php/.test(res.body.toString('latin1')), `GET ${p} -> ${res.status}`);
    for (const h of ['x-robots-tag', 'www-authenticate']) if (res.headers[h]) leaks.push(`${p} sends ${h}: ${res.headers[h]}`);
  }
  for (const [label, o] of [['404 page', { pathname: '/no-such-page-rehearsal/' }], ['redirect', { pathname: '/contact/' }]]) {
    const res = await get(o.pathname);
    for (const h of ['x-robots-tag', 'www-authenticate']) if (res.headers[h]) leaks.push(`${label} sends ${h}: ${res.headers[h]}`);
  }
  check('D4-no-staging-overlay-leak', leaks.length === 0, leaks.length ? leaks.join('; ') : 'no X-Robots-Tag or auth challenge on any response');
  if (expectedHtaccess !== null) {
    const installed = fs.readFileSync(path.join(siteDir, '.htaccess'), 'utf8');
    check('D5-htaccess-is-production-candidate', installed === expectedHtaccess && preflight(installed, 'production').length === 0, 'docroot .htaccess equals deploy/apache/production.htaccess and passes the production preflight');
  }

  // E. robots, sitemap and canonical.
  const robots = (await get('/robots.txt')).body.toString('utf8');
  check('E1-robots', /^Sitemap:\s*https:\/\/bonafidenitro\.com\/sitemap\.xml\s*$/m.test(robots) && !/^\s*disallow:\s*\/\s*$/im.test(robots), 'robots.txt declares the apex sitemap and has no blanket Disallow');
  const sitemap = (await get('/sitemap.xml')).body.toString('utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check('E2-sitemap-nonempty', locs.length > 0 && locs.every((l) => l.startsWith(`${ORIGIN}/`)), `${locs.length} sitemap URL(s), all on ${ORIGIN}`);
  for (const loc of locs) {
    const p = loc.slice(ORIGIN.length);
    const res = await get(p);
    const html = res.body.toString('utf8');
    check(`E3-sitemap-url:${p}`, res.status === 200 && canonicalOf(html) === loc && !/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html), `GET ${p} -> ${res.status}, canonical ${canonicalOf(html)}, ${/noindex/i.test(html) ? 'NOINDEX' : 'indexable'}`);
  }

  // F. critical public paths: served content, not just status.
  for (const c of CRITICAL_PAGES) {
    const res = await get(c.path);
    const html = res.body.toString('utf8');
    const problems = [];
    if (res.status !== 200) problems.push(`status ${res.status}`);
    if (c.canonical && canonicalOf(html) !== `${ORIGIN}${c.path}`) problems.push(`canonical ${canonicalOf(html)}`);
    if (c.title && !c.title.test(html.match(/<title>([^<]*)/i)?.[1] ?? '')) problems.push('title mismatch');
    for (const s of c.includes ?? []) if (!html.includes(s)) problems.push(`missing ${s}`);
    for (const s of c.excludes ?? []) if (html.includes(s)) problems.push(`unexpected ${s}`);
    const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
    if (Boolean(c.noindex) !== noindex) problems.push(c.noindex ? 'expected noindex' : 'unexpected noindex');
    if (c.noindex && locs.includes(`${ORIGIN}${c.path}`)) problems.push('noindex page is in sitemap');
    check(`F1-critical:${c.id}`, problems.length === 0, `${c.path}: ${problems.join(', ') || 'ok'}`);
    for (const ref of localRefs(html)) {
      const r = await get(ref);
      const file = fileForUrl(siteDir, ref);
      check(`F2-reference:${c.id}:${ref}`, r.status === 200 && file !== null, `${c.path} references ${ref} -> ${r.status}${file ? '' : ' (no packaged file)'}`);
    }
  }
  const fav = await get('/favicon.ico');
  check('F3-favicon', fav.status === 200 && fav.body.length > 0 && EXPECTED_TYPE['.ico'].test(fav.headers['content-type'] ?? ''), `GET /favicon.ico -> ${fav.status} ${fav.headers['content-type']} (${fav.body.length} bytes)`);
  const productImages = localRefs((await get('/products/')).body.toString('utf8')).filter((r) => /\.(?:png|jpe?g|webp|avif)$/i.test(r));
  check('F4-product-images', productImages.length > 0 && productImages.every((r) => fileForUrl(siteDir, r)), `${productImages.length} product-page image reference(s) all packaged`);
  return results;
};

export const rehearseApache = async ({ zip, htaccess, redirects, apache = findApache(), keep = false }) => {
  const out = { results: [], apache, stage: 'start' };
  const fail = (id, detail) => { out.results.push({ id, ok: false, detail }); return out; };
  if (apache.error) return fail('P0-apache-available', `${apache.error}; the Apache rehearsal could not run, so nothing was simulated`);
  if (!isFile(htaccess)) return fail('P1-production-htaccess', `${htaccess} missing`);
  const htaccessText = fs.readFileSync(htaccess, 'utf8');
  const redirectsText = fs.readFileSync(redirects, 'utf8');
  const problems = preflight(htaccessText, 'production');
  if (problems.length) return fail('P1-production-preflight', problems.join('; '));
  const zipCheck = rehearse({ zip, redirects: redirectsText, forbiddenStrings: loadBaseline().preservationRules.forbiddenBuildStrings });
  if (zipCheck.findings.length) return fail('P2-zip-rehearsal', zipCheck.findings.map((f) => `[${f.invariant}] ${f.file}: ${f.detail}`).join('; '));
  if (spawnSync('openssl', ['version']).status !== 0) return fail('P0-openssl-available', 'openssl is required to mint the throwaway loopback certificate');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b162-'));
  fs.chmodSync(tmp, 0o755);
  let child = null;
  try {
    const unzip = spawnSync('unzip', ['-q', '-o', path.resolve(zip), '-d', path.join(tmp, 'pkg')], { encoding: 'utf8' });
    if (unzip.status !== 0) return fail('P2-unzip', unzip.stderr);
    const docroot = path.join(tmp, 'pkg', PACKAGE_ROOT, 'site');
    fs.copyFileSync(htaccess, path.join(docroot, '.htaccess'));
    fs.chmodSync(path.join(docroot, '.htaccess'), 0o644);
    spawnSync('chmod', ['-R', 'a+rX', path.join(tmp, 'pkg')]);
    fs.mkdirSync(path.join(tmp, 'run')); fs.mkdirSync(path.join(tmp, 'mutex')); spawnSync('chmod', ['a+rwx', path.join(tmp, 'run'), path.join(tmp, 'mutex')]);
    const cert = path.join(tmp, 'cert.pem'); const key = path.join(tmp, 'key.pem');
    const ssl = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=bonafidenitro.com'], { encoding: 'utf8' });
    if (ssl.status !== 0) return fail('P0-openssl-cert', ssl.stderr);
    spawnSync('chmod', ['a+r', key, cert]);
    const ports = { http: await freePort(), https: await freePort() };
    const conf = path.join(tmp, 'httpd.conf');
    fs.writeFileSync(conf, apacheConf({ root: tmp, docroot, ports, bin: apache.bin, modules: apache.modules, mimeFile: MIME_TYPES_FILES.find(isFile) ?? null, cert, key }));
    const syntax = spawnSync(apache.bin, ['-f', conf, '-t'], { encoding: 'utf8' });
    if (syntax.status !== 0) return fail('P3-apache-config', `generated Apache config rejected: ${syntax.stderr.trim()}`);
    child = spawn(apache.bin, ['-f', conf, '-D', 'FOREGROUND'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    if (!(await waitForPort(ports.http)) || !(await waitForPort(ports.https))) return fail('P3-apache-start', `Apache did not start: ${stderr.trim() || fs.readFileSync(path.join(tmp, 'error.log'), 'utf8').trim()}`);
    out.stage = 'served';
    out.results.push(...await runAssertions({ siteDir: docroot, ports, redirectsText, expectedHtaccess: htaccessText }));
    const errLog = fs.existsSync(path.join(tmp, 'error.log')) ? fs.readFileSync(path.join(tmp, 'error.log'), 'utf8') : '';
    const bad = errLog.split('\n').filter((l) => /\[(?:alert|crit|emerg|error)\]/.test(l) && !/File does not exist|script not found|client denied by server configuration/.test(l));
    out.results.push({ id: 'G1-apache-error-log', ok: bad.length === 0, detail: bad.length ? bad.slice(0, 3).join(' | ') : 'no unexpected error-level Apache log lines' });
    return out;
  } finally {
    if (child) { child.kill('SIGTERM'); await new Promise((r) => { child.once('exit', r); setTimeout(r, 3000); }); }
    if (!keep) fs.rmSync(tmp, { recursive: true, force: true });
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
  const result = await rehearseApache({
    zip: path.resolve(flag('--zip') ?? 'preview-out/bonafide-preview.zip'),
    htaccess: path.resolve(flag('--htaccess') ?? 'deploy/apache/production.htaccess'),
    redirects: path.resolve(flag('--redirects') ?? 'deploy/apache/redirects.htaccess'),
  });
  const failed = result.results.filter((r) => !r.ok);
  for (const r of failed) console.error(`[${r.id}] ${r.detail}`);
  if (failed.length || !result.results.length) {
    console.log(`BLOCKED: ${failed.length} failed of ${result.results.length} checks${result.apache.version ? ` under ${result.apache.version}` : ''}`);
    process.exit(1);
  }
  const groups = result.results.reduce((a, r) => { const g = r.id.split(/[-:]/)[0]; a[g] = (a[g] ?? 0) + 1; return a; }, {});
  console.log(`PASS: ${result.results.length} checks under ${result.apache.version} on 127.0.0.1 (${Object.entries(groups).map(([g, n]) => `${g}:${n}`).join(' ')})`);
  console.log('Simulated offline: .htaccess redirects/ErrorDocument/MIME on a packaged docroot over loopback HTTP+HTTPS (throwaway self-signed cert). NOT simulated: the real host\'s Apache modules, AllowOverride, docroot model, TLS, CDN, PHP coexistence, DNS.');
}
