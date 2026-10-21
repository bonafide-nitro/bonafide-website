// Issue #162: executable Apache rehearsal. Needs a real apache2/httpd and openssl; the CI release job installs
// apache2 and sets REQUIRE_APACHE=1 so a missing binary is a failure there instead of a skip.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { packagePreview } from '../../scripts/package-preview.mjs';
import { findApache, parseRules, declaredRuleCount, rehearseApache } from '../../scripts/rehearse-apache.mjs';

const apache = findApache();
const skip = apache.error && process.env.REQUIRE_APACHE !== '1' ? `no Apache in this environment: ${apache.error}` : false;
const HTACCESS = path.resolve('deploy/apache/production.htaccess');
const REDIRECTS = path.resolve('deploy/apache/redirects.htaccess');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'b162t-'));
const REDIR_TEXT = fs.readFileSync(REDIRECTS, 'utf8');

const SITE = {
  'index.html': '<!doctype html><title>Nitro</title><link rel="canonical" href="https://bonafidenitro.com/">',
  '404.html': '<!doctype html><meta name="robots" content="noindex"><title>404</title>',
  'robots.txt': 'User-agent: *\nDisallow:\n\nSitemap: https://bonafidenitro.com/sitemap.xml\n',
  'sitemap.xml': '<urlset><url><loc>https://bonafidenitro.com/</loc></url></urlset>',
};
const mkZip = (files) => {
  const dist = path.join(tmp(), 'dist');
  for (const [rel, body] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dist, rel)), { recursive: true }); fs.writeFileSync(path.join(dist, rel), body); }
  return packagePreview({ dist, out: path.join(tmp(), 'out') }).zip;
};

test('rule parser reads every generated redirect rule and the header count agrees', () => {
  const rules = parseRules(REDIR_TEXT);
  assert.equal(rules.length, declaredRuleCount(REDIR_TEXT));
  assert.equal(rules.length, 41);
  assert.equal(rules.filter((r) => r.conds.some((c) => /HTTPS|HTTP_HOST/.test(c.test))).length, 3);
  assert.ok(rules.every((r) => r.name), 'every rule keeps its identifier comment');
});

test('missing Apache fails closed and says nothing was simulated', async () => {
  const r = await rehearseApache({ zip: mkZip(SITE), htaccess: HTACCESS, redirects: REDIRECTS, apache: { error: 'no apache2/httpd binary found' } });
  assert.equal(r.results.length, 1);
  assert.equal(r.results[0].ok, false);
  assert.match(r.results[0].detail, /nothing was simulated/);
});

test('a production .htaccess carrying a staging noindex header is refused before Apache starts', async () => {
  const bad = path.join(tmp(), 'bad.htaccess');
  fs.writeFileSync(bad, `${fs.readFileSync(HTACCESS, 'utf8')}Header always set X-Robots-Tag "noindex, nofollow"\n`);
  const r = await rehearseApache({ zip: mkZip(SITE), htaccess: bad, redirects: REDIRECTS, apache: { bin: '/nonexistent', modules: '/nonexistent' } });
  assert.equal(r.results[0].id, 'P1-production-preflight');
  assert.equal(r.results[0].ok, false);
});

test('a package whose home page is noindex is refused by the zip rehearsal before serving', async () => {
  const zip = mkZip({ ...SITE, 'index.html': '<!doctype html><meta name="robots" content="noindex"><title>x</title>' });
  const r = await rehearseApache({ zip, htaccess: HTACCESS, redirects: REDIRECTS, apache: { bin: '/nonexistent', modules: '/nonexistent' } });
  assert.equal(r.results[0].id, 'P2-zip-rehearsal');
  assert.match(r.results[0].detail, /noindex/);
});

test('the real packaged build passes end to end under real Apache', { skip, timeout: 170000 }, async (t) => {
  const dist = path.resolve('dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) return t.skip('dist/ not built (run npm run build)');
  const { zip } = packagePreview({ dist, out: path.join(tmp(), 'out') });
  const r = await rehearseApache({ zip, htaccess: HTACCESS, redirects: REDIRECTS });
  const failed = r.results.filter((x) => !x.ok);
  assert.deepEqual(failed, []);
  const ids = r.results.map((x) => x.id);
  for (const prefix of ['A1-redirect:', 'A3-canonical-host:', 'B1-trailing-slash:', 'C1-served:', 'C2-mime:', 'D1-404', 'D3-absent:', 'D4-no-staging', 'E1-robots', 'E3-sitemap-url:', 'F1-critical:contact', 'F1-critical:booking-disabled', 'F3-favicon', 'F4-product-images']) {
    assert.ok(ids.some((i) => i.startsWith(prefix)), `rehearsal ran ${prefix}`);
  }
  assert.equal(ids.filter((i) => i.startsWith('A1-redirect:')).length, 38, '38 path rules + 3 protocol checks = the 41 generated rules');
});

test('a package missing a redirect destination is refused by the zip rehearsal (R7)', async () => {
  // redirects.htaccess points at pages this tiny site does not ship.
  const r = await rehearseApache({ zip: mkZip(SITE), htaccess: HTACCESS, redirects: REDIRECTS, apache: { bin: '/nonexistent', modules: '/nonexistent' } });
  assert.equal(r.results[0].id, 'P2-zip-rehearsal');
  assert.match(r.results[0].detail, /R7-redirect-target/);
});

test('real Apache catches a served redirect that differs from the expected rules', { skip, timeout: 120000 }, async () => {
  const wrong = path.join(tmp(), 'redirects.htaccess');
  // Expects /contact/ -> /; the production .htaccess actually sends it to the contact page, so the check must fail.
  fs.writeFileSync(wrong, '# Rules: 1\n# contact-slash\nRewriteRule ^contact/$ https://bonafidenitro.com/ [R=301,L]\n');
  const r = await rehearseApache({ zip: mkZip(SITE), htaccess: HTACCESS, redirects: wrong });
  assert.ok(r.results.some((x) => x.id === 'A1-redirect:contact-slash' && !x.ok), 'mismatching Location is reported');
  assert.ok(r.results.some((x) => x.id === 'A0-protocol-rules' && !x.ok), 'missing protocol rules are reported');
});
