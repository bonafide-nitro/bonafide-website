// Block 63 (Issue #143): offline WXR extraction + exact-text port. No network, no raw WXR needed (the sanitized evidence is committed).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseContent, classifyHref, decode } from '../../scripts/wxr-extract.mjs';
import { EVIDENCE, entry, plain } from './block63-helper.mjs';

const built = fs.existsSync('dist/index.html');
const t = (name, fn) => test(name, { skip: !built && 'dist/ not built' }, fn);
const config = JSON.parse(fs.readFileSync('qa/qa.config.json', 'utf8'));
const ROUTES = new Set(['/', '/products/', '/howtobuy/']);

// ---- extractor: sanitisation ------------------------------------------------------------------------------------
test('extractor drops scripts, styles, iframes, forms, inputs, shortcodes and event-handler attributes', () => {
  const html = '<p onclick="x()">Hi <a href="javascript:alert(1)">bad</a> <a href="/howtobuy/" onmouseover="y()">ok</a></p><script>evil()</script><style>p{}</style><iframe src="https://evil.example"></iframe><form><input name="e"></form>[tcb_pagination x="1"]<p>[shortcode] text</p>';
  const r = parseContent(html, ROUTES);
  const out = JSON.stringify(r.blocks);
  assert.ok(!/script|evil|iframe|onclick|onmouseover|javascript:|<input|<form|tcb_|\[shortcode\]/i.test(out), out);
  assert.ok(out.includes('<a href=\\"/howtobuy/\\">ok</a>'));
  assert.deepEqual([r.stats.removedScripts, r.stats.removedIframes, r.stats.removedForms], [2, 1, 1]);
});

test('classifyHref accepts only http(s)/mailto/tel; unsafe schemes and unrouted internal paths are not linkable', () => {
  assert.equal(classifyHref('javascript:alert(1)', ROUTES).kind, 'unsafe-scheme');
  assert.equal(classifyHref('data:text/html,x', ROUTES).kind, 'unsafe-scheme');
  assert.equal(classifyHref('https://bonafidenitro.com/howtobuy', ROUTES).path, '/howtobuy/');
  assert.equal(classifyHref('http://www.bonafidenitro.com/nope/', ROUTES).kind, 'internal-unrouted');
  assert.equal(classifyHref('https://bonafidenitro.com/wp-content/uploads/2020/07/a.jpg', ROUTES).kind, 'upload');
  assert.equal(classifyHref('https://example.org/x', ROUTES).kind, 'external');
});

test('page-builder JSON/CSS that leaked into text is dropped as configuration, not copy', () => {
  const r = parseContent('<p>Real copy.</p><p>{ "product": { "styles": { "@media (min-width: 601px)": { "max-width": "25%" } } } }</p>', ROUTES);
  assert.deepEqual(r.blocks.map((b) => b.html), ['Real copy.']);
  assert.equal(r.stats.removedConfigBlocks, 1);
});

test('html entities decode and text is re-escaped (no markup injection from entity-encoded tags)', () => {
  assert.equal(decode('&lt;b&gt; &amp; &#8217;'), '<b> & ’');
  const r = parseContent('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>', ROUTES);
  assert.ok(!r.blocks[0].html.includes('<script'));
});

// ---- committed evidence hygiene --------------------------------------------------------------------------------
test('evidence file carries no scripts, iframes, handlers, private emails or admin/API paths', () => {
  const raw = fs.readFileSync('docs/migration/data/block63-wxr-evidence.json', 'utf8');
  assert.ok(!/<script|<iframe|<style|\son[a-z]+=|javascript:|wp-admin|wp-json|wp-login/i.test(raw));
  assert.deepEqual([...new Set(raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])], ['contact@bonafidenitro.com']);
  const allowed = ['slug', 'type', 'status', 'date', 'modified', 'title', 'seoTitle', 'seoDescription', 'categories', 'blocks', 'links', 'images', 'uploadRefs', 'embeds', 'removed', 'faqs'];
  for (const e of EVIDENCE.entries) for (const k of Object.keys(e)) assert.ok(allowed.includes(k), `${e.slug}: unexpected key ${k}`);
});

test('the raw WXR export is not in the repository tree', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (['node_modules', '.git', 'dist', '.astro'].includes(e.name) ? [] : e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
  const files = walk('.');
  assert.ok(!files.some((f) => /\.WordPress\.\d{4}-\d{2}-\d{2}\.xml$/i.test(f) || /\.xml$/i.test(f) && fs.statSync(f).size > 1_000_000));
});

// ---- exact text port --------------------------------------------------------------------------------------------
const PORTED = [...config.articleRoutes, '/nitro-coffee-kegs/', '/nitro-coffee-questions/', '/about/', '/howtobuy/'];
const textOf = (b) => plain(b.html ?? (b.items ?? []).join(' ')).toLowerCase().trim();
for (const route of PORTED) {
  t(`${route}: every exported paragraph, heading and list item is on the built page, in order`, () => {
    const e = entry(route.replaceAll('/', ''));
    const html = fs.readFileSync(`dist${route}index.html`, 'utf8').replace(/<header id="masthead"[\s\S]*?<\/header>/, '');
    const page = plain(html.match(/<main[^>]*>([\s\S]*)<\/main>/)[1]).toLowerCase();
    let at = 0;
    const h1 = plain((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? [])[1] ?? '').toLowerCase().trim();
    const faq = route === '/nitro-coffee-questions/' ? EVIDENCE.entries.filter((x) => x.type === 'wpsm_faq_r') : [];
    for (const b of e.blocks) {
      if (b.t === 'img') continue;
      if (b.t === 'p' && /^(?:&?amp;)*(?:&|amp;)?lt;img\s/i.test(b.html)) continue; // multiply-encoded <img> tag in the export: dropped, its file is recorded as unrecovered media
      const pieces = b.t === 'ul' || b.t === 'ol' ? b.items.map((i) => textOf({ html: i })) : [textOf(b)];
      for (const piece of pieces) {
        if (!piece || piece === e.title.toLowerCase().trim() || piece === h1) continue; // title/H1 duplicates are emitted once as the pinned H1
        const i = page.indexOf(piece, at);
        assert.ok(i >= 0, `${route}: missing or out of order: "${piece.slice(0, 80)}"`);
        at = i + piece.length;
      }
    }
    for (const g of faq) for (const f of g.faqs) assert.ok(page.includes(plain(f.question).toLowerCase().trim()), `${route}: FAQ "${f.question}"`);
  });
}

t('meta descriptions on ported pages are exactly the _aioseop_description values from the export', () => {
  for (const route of PORTED) {
    const e = entry(route.replaceAll('/', ''));
    const html = fs.readFileSync(`dist${route}index.html`, 'utf8');
    const d = [...html.matchAll(/<meta name="description" content="([^"]*)"/g)].map((m) => decode(m[1]));
    if (e.seoDescription) assert.deepEqual(d, [e.seoDescription.trim()], route);
  }
});

// ---- scaffold honesty -------------------------------------------------------------------------------------------
test('only routes with no unrecovered media and no embed are cleared; everything else keeps a recorded blocker', () => {
  const exists = (u) => fs.existsSync(`public${u}`);
  for (const route of config.articleScaffold.cleared) {
    const e = entry(route.replaceAll('/', ''));
    assert.deepEqual(e.uploadRefs.filter((u) => !exists(u)), [], route);
    assert.deepEqual(e.embeds, [], route);
  }
  for (const [route, why] of Object.entries({ ...config.articleScaffold.remaining, ...config.nonArticleScaffold.remaining })) {
    const e = EVIDENCE.entries.find((x) => x.slug === route.replaceAll('/', '') && x.type !== 'wpsm_faq_r');
    if (!e || !/Block 63/.test(why)) continue;
    const missing = e.uploadRefs.filter((u) => !exists(u));
    if (missing.length) assert.match(why, /image binar|referenced image/, route);
  }
});

t('every <img> on a page is an upload the export evidences for that route, present in public/', () => {
  for (const route of PORTED) {
    const e = entry(route.replaceAll('/', ''));
    const html = fs.readFileSync(`dist${route}index.html`, 'utf8').replace(/<header id="masthead"[\s\S]*?<\/header>/, '');
    for (const [, src] of html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)) {
      assert.ok(e.uploadRefs.includes(src) || e.blocks.some((b) => b.src === src), `${route}: ${src} not evidenced by the export`);
      assert.ok(fs.existsSync(`public${src}`), `${route}: ${src} binary absent`);
    }
  }
});

t('no built page embeds iframes or links to redirect-fragment shorteners; videos are only evidenced plain links', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(`${d}/${x.name}`) : x.name.endsWith('.html') ? [`${d}/${x.name}`] : []));
  const videos = new Set(EVIDENCE.entries.flatMap((e) => [...e.embeds, ...(e.faqs ?? []).flatMap((g) => g.links ?? []).map((l) => l.href)]).filter(Boolean).map((u) => u.replace('/embed/', '/watch?v=')));
  for (const f of walk('dist')) {
    const h = fs.readFileSync(f, 'utf8');
    assert.ok(!/<iframe/i.test(h) && !/bit\.ly/i.test(h), f);
    for (const [u] of h.matchAll(/https:\/\/www\.youtube\.com\/[^"<\s]*/g)) {
      const c = u.replace(/&amp;/g, '&');
      assert.ok([...videos].some((v) => v === c || v.startsWith(c)) || EVIDENCE.entries.some((e) => JSON.stringify(e).includes(c.replace(/&/g, '&'))), `${f}: ${u}`);
    }
  }
});

t('/3-cups-of-coffee-…: multiply-encoded image markup is never rendered as literal text', () => {
  const html = fs.readFileSync('dist/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/index.html', 'utf8');
  assert.ok(!/&(amp;)*(lt|gt);|&lt;img|data-init-width/i.test(html.replace(/<script[\s\S]*?<\/script>/g, '')));
  assert.match(config.articleScaffold.remaining['/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/'], /3-Cups-of-Coffee-a-Day--Why-It-Can-Be-Good-for-the-Health\.jpg/);
});

test('every external image in the evidence is listed in its route blocker (articles that stay scaffolded)', () => {
  for (const [route, why] of Object.entries(config.articleScaffold.remaining)) {
    const e = entry(route.replaceAll('/', ''));
    for (const i of e.images.filter((x) => x.kind === 'external')) assert.ok(why.includes(decodeURIComponent(i.src.split('/').pop())), `${route}: ${i.src}`);
  }
});
