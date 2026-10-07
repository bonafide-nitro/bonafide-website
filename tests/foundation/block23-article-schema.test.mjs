// Block 23 (Issue #64): Article + Person JSON-LD on the historical posts, checked against the built dist/.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { POSTS, isoFromArchiveText } from '../../src/lib/article-schema.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const ORIGIN = 'https://bonafidenitro.com';
const graphs = (p) => [...fs.readFileSync(`dist${p}index.html`, 'utf8').matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
const nodes = (p) => graphs(p).flatMap((g) => g['@graph']);
const baseline = JSON.parse(fs.readFileSync('src/data/seo-baseline.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('qa/qa.config.json', 'utf8'));

test('15 evidenced posts; archive date text converts deterministically', () => {
  assert.equal(POSTS.length, 15);
  assert.equal(new Set(POSTS.map((p) => p.path)).size, 15);
  assert.equal(isoFromArchiveText('Aug 24, 2022'), '2022-08-24');
  assert.equal(isoFromArchiveText('Jan 2, 2020'), '2020-01-02');
  assert.throws(() => isoFromArchiveText('24 August 2022'));
});

test('qa config articleRoutes equals the post routes, all protected in the manifest', () => {
  assert.deepEqual([...config.articleRoutes].sort(), POSTS.map((p) => p.path).sort());
  const protectedPaths = new Set(baseline.urls.map((u) => u.path));
  for (const p of config.articleRoutes) assert.ok(protectedPaths.has(p), p);
});

for (const post of POSTS) {
  t(`${post.path}: exactly one Article linked to exactly one Person; evidenced fields only`, () => {
    const ns = nodes(post.path);
    const arts = ns.filter((n) => n['@type'] === 'Article');
    const people = ns.filter((n) => n['@type'] === 'Person');
    assert.equal(arts.length, 1);
    assert.equal(people.length, 1);
    const ids = ns.map((n) => n['@id']).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, 'no duplicate @id');
    const [a] = arts; const [pe] = people;
    const expected = {
      '@type': 'Article', '@id': `${ORIGIN}${post.path}#article`, headline: post.title,
      mainEntityOfPage: { '@id': `${ORIGIN}${post.path}#webpage` }, datePublished: post.date,
      ...(post.upd ? { dateModified: isoFromArchiveText(post.upd) } : {}),
      author: { '@id': pe['@id'] },
    };
    assert.deepEqual(a, expected);
    assert.deepEqual(pe, { '@type': 'Person', '@id': `${ORIGIN}/author/admin/#person`, name: 'John Goerke', url: `${ORIGIN}/author/admin/` });
    assert.ok(ns.some((n) => n['@id'] === a.mainEntityOfPage['@id']), 'mainEntityOfPage resolves to the WebPage node');
    for (const t of ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']) assert.ok(ns.some((n) => n['@type'] === t), t);
    for (const k of ['image', 'publisher', 'description']) assert.ok(!(k in a), `no unevidenced ${k}`);
    assert.equal(graphs(post.path).length, 1, 'single JSON-LD block');
  });
}

t('no Article/Person on any other built page (archives included)', () => {
  const posts = new Set(POSTS.map((p) => p.path));
  const walk = (d) => fs.readdirSync(`dist${d}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}${e.name}/`) : e.name === 'index.html' ? [d] : []));
  const routes = walk('/');
  assert.ok(routes.length > 30);
  for (const r of routes.filter((r) => !posts.has(r))) assert.ok(!nodes(r).some((n) => /^(Article|Person)$/.test(n['@type'])), r);
});

t('JSON-LD is deterministic across builds of the same input (stable key order)', () => {
  const a = fs.readFileSync('dist/is-coffee-healthy/index.html', 'utf8').match(/"@type":"Article".*?"@type":"Person"/s)[0];
  assert.ok(a.indexOf('"headline"') < a.indexOf('"datePublished"') && a.indexOf('"datePublished"') < a.indexOf('"dateModified"') && a.indexOf('"dateModified"') < a.indexOf('"author"'));
});
