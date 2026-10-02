// Block 13 (Issue #44): GTM integration layer. Default-build checks run against dist/ built
// WITHOUT PUBLIC_GTM_ID; configured/invalid cases build into a temp dir with a dummy value.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveGtmId } from '../../src/lib/gtm.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const GTM_MARKUP = /googletagmanager|gtm\.js|gtm\.start|dataLayer|ns\.html/i;

test('resolveGtmId accepts only a syntactically valid GTM container ID', () => {
  assert.equal(resolveGtmId('GTM-ABC1234'), 'GTM-ABC1234');
  assert.equal(resolveGtmId('  GTM-X7K9QZ '), 'GTM-X7K9QZ');
  for (const bad of [undefined, null, '', '   ', 42, 'gtm-abc1234', 'GTM-', 'GTM-ABC', 'G-ABC1234', 'UA-12345-1', 'GTM-ABC1234\');alert(1);//', 'GTM-ABC 1234', '"><script>', 'https://www.googletagmanager.com/gtm.js?id=GTM-ABC1234', 'GTM-ABCDEFGHIJKLM']) {
    assert.equal(resolveGtmId(bad), null, String(bad));
  }
});

t('default build (no PUBLIC_GTM_ID): no GTM script/noscript/iframe on any page', () => {
  const pages = walk('dist').filter((f) => f.endsWith('.html'));
  assert.ok(pages.length > 30);
  for (const f of pages) {
    const h = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(!GTM_MARKUP.test(h), `${f} has GTM markup`);
    assert.ok(!/<iframe/i.test(h), `${f} has an iframe`);
  }
});

test('source: GTM wired once via the site-wide layout; no hard-coded ID, Meta Pixel, Klaviyo or compromised strings', () => {
  const layout = fs.readFileSync('src/layouts/Base.astro', 'utf8');
  assert.equal([...layout.matchAll(/<GoogleTagManager /g)].length, 2, 'head + body, once each');
  const pagesSrc = walk('src/pages').map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.ok(!/GoogleTagManager|googletagmanager/i.test(pagesSrc), 'not duplicated per page');
  const own = ['src/lib/gtm.mjs', 'src/components/GoogleTagManager.astro', 'src/layouts/Base.astro'].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const code = own.replace(/\/\/[^\n]*|<!--[\s\S]*?-->/g, '');
  assert.ok(!/GTM-[A-Z0-9]{4,}/.test(code.replace(/\^GTM-\[A-Z0-9\]\{4,12\}\$/, '')), 'no hard-coded container ID');
  assert.ok(!/fbq|connect\.facebook|fbevents|klaviyo|static\.klaviyo|gtag\(|google-analytics|quickdelivr|coredelivr|mpackage/i.test(code));
});

const buildWith = (id) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'gtm-'));
  const r = spawnSync('npx', ['astro', 'build', '--outDir', out], { env: { ...process.env, PUBLIC_GTM_ID: id }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return out;
};

test('valid dummy PUBLIC_GTM_ID: loader in <head>, noscript iframe first in <body>, every page', { timeout: 120000 }, () => {
  const out = buildWith('GTM-ABC1234');
  try {
    const pages = walk(out).filter((f) => f.endsWith('.html'));
    assert.ok(pages.length > 30);
    for (const f of pages) {
      const h = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      const head = h.match(/<head[^>]*>([\s\S]*?)<\/head>/)[1];
      const body = h.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
      assert.equal([...head.matchAll(/googletagmanager\.com\/gtm\.js/g)].length, 1, f);
      assert.ok(head.includes('"GTM-ABC1234"'), f);
      assert.equal([...body.matchAll(/<iframe/g)].length, 1, f);
      assert.ok(/^\s*<noscript><iframe src="https:\/\/www\.googletagmanager\.com\/ns\.html\?id=GTM-ABC1234"/.test(body), f);
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('invalid PUBLIC_GTM_ID: build succeeds and emits no GTM markup', { timeout: 120000 }, () => {
  const out = buildWith("GTM-BAD');alert(1);//");
  try {
    for (const f of walk(out).filter((x) => x.endsWith('.html'))) {
      const h = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      assert.ok(!GTM_MARKUP.test(h) && !/<iframe/i.test(h), f);
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
