// Block 19 (Issue #56): static robots.txt, sitemap.xml and real 404.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadBaseline } from '../../src/lib/data.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const locs = () => [...fs.readFileSync('dist/sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

t('robots.txt declares the static sitemap and disallows nothing', () => {
  const robots = fs.readFileSync('dist/robots.txt', 'utf8');
  assert.match(robots, /^Sitemap: https:\/\/bonafidenitro\.com\/sitemap\.xml$/m);
  assert.match(robots, /^User-agent: \*$/m);
  for (const line of robots.split(/\r?\n/)) {
    const m = line.match(/^\s*disallow:\s*(.*)$/i);
    if (m) assert.equal(m[1].trim(), '', `unexpected disallow: ${line}`);
  }
  assert.doesNotMatch(robots, /wp-sitemap|wpo|wp-admin/i);
});

t('sitemap.xml lists exactly the manifest inSitemap URLs, both product pages included', () => {
  const expected = loadBaseline().urls.filter((u) => u.inSitemap === true).map((u) => 'https://bonafidenitro.com' + u.path);
  assert.deepEqual(locs(), expected);
  assert.ok(locs().includes('https://bonafidenitro.com/products/'));
  assert.ok(locs().includes('https://bonafidenitro.com/products-2/'));
  assert.equal(new Set(locs()).size, locs().length);
});

t('sitemap.xml excludes noindex/legal/utility routes', () => {
  for (const p of ['/privacy-policies/', '/terms-of-service/', '/book-appointment/', '/404.html']) {
    assert.ok(!locs().includes('https://bonafidenitro.com' + p), p);
  }
});

t('404.html is a real page, not a scaffold, and does not redirect', () => {
  const html = fs.readFileSync('dist/404.html', 'utf8');
  assert.ok(!html.includes('scaffold-placeholder'));
  assert.doesNotMatch(html, /http-equiv=["']refresh/i);
  assert.doesNotMatch(html, /location\.(href|replace|assign)/);
  assert.match(html, /<h1>Page not found<\/h1>/);
  assert.match(html, /<meta name="robots" content="noindex"/);
  assert.match(html, /<a [^>]*href="\/"/);
});
