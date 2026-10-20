#!/usr/bin/env node
// Block 63 — port the sanitized WXR body text of the historical posts into the existing Astro article pages.
// Offline. Reads the evidence manifest produced by wxr-extract.mjs and rewrites ONLY the article body
// (everything after the byline paragraph). Layout, title, canonical, breadcrumbs and byline stay as they are.
import { readFileSync, writeFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const cfg = JSON.parse(readFileSync('qa/qa.config.json', 'utf8'));
// External commerce destinations must go through the registry (src/data/commerce.yaml); pending redirect fragments (bit.ly) are never rendered.
const REGISTRY = Object.entries(parseYaml(readFileSync('src/data/commerce.yaml', 'utf8')).links).map(([id, l]) => [l.href, id]);
const droppedLinks = [];
const fixLinks = (html) => html.replace(/<a href="([^"]+)"( rel="noopener")?>([\s\S]*?)<\/a>/g, (all, href, rel, text) => {
  const raw = href.replace(/&amp;/g, '&');
  const hit = REGISTRY.find(([h]) => h === raw);
  if (hit) return `<a href={commerceHref('${hit[1]}')}${rel ?? ''}>${text}</a>`;
  if (/^https?:\/\/([^/]*\.)?(nitrocoffee\.store|amazon\.com|amzn\.to|bit\.ly)\b/i.test(raw)) { droppedLinks.push(raw); return text; }
  return all;
});
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const yt = (u) => u.replace(/\/embed\//, '/watch?v=');

const exists = (u) => { try { readFileSync(`public${u}`); return true; } catch { return false; } };
const render = (e, faqGroups = [], h1Text = '') => {
  const out = [];
  let first = true;
  for (const b of e.blocks) {
    if (first && b.t !== 'ul' && b.t !== 'img' && b.t !== 'ol' && b.html.replace(/<[^>]+>/g, '').trim().toLowerCase() === e.title.trim().toLowerCase()) { first = false; continue; }
    first = false;
    if (b.t === 'h' && h1Text && b.html.replace(/<[^>]+>/g, '').trim().toLowerCase() === h1Text) continue; // the page's pinned H1 is already emitted
    if (b.t === 'img') {
      if (!exists(b.src)) { if (b.href && b.alt) out.push(`    <p><a href="${attr(b.href)}"${b.href.startsWith('/') ? '' : ' rel="noopener"'}>${attr(b.alt)}</a></p>`); continue; } // binary not in the repo: never reference a file that is not there
      const dims = b.width && b.height ? ` width="${b.width}" height="${b.height}"` : '';
      out.push(`    <figure class="page-media"><img src="${attr(b.src)}" alt="${attr(b.alt ?? '')}"${dims} loading="lazy" /></figure>`);
      continue;
    }
    if (b.t === 'h') {
      out.push(`    <h${Math.max(2, b.l)}>${b.html}</h${Math.max(2, b.l)}>`);
      const g = faqGroups.find((x) => x.title.trim().toLowerCase() === b.html.replace(/<[^>]+>/g, '').trim().toLowerCase());
      for (const f of g?.faqs ?? []) {
        out.push(`    <h${Math.max(3, b.l + 1)}>${f.question.replace(/&/g, '&amp;')}</h${Math.max(3, b.l + 1)}>`);
        for (const fb of f.blocks) out.push(fb.t === 'p' ? `    <p>${fb.html}</p>` : fb.t === 'ul' || fb.t === 'ol' ? `    <${fb.t}>${fb.items.map((i) => `<li>${i}</li>`).join('')}</${fb.t}>` : '');
      }
    }
    else if (b.t === 'p') out.push(`    <p>${b.html}</p>`);
    else if (b.t === 'quote') out.push(`    <blockquote><p>${b.html}</p></blockquote>`);
    else out.push(`    <${b.t}>\n${b.items.map((i) => `      <li>${i}</li>`).join('\n')}\n    </${b.t}>`);
  }
  return out.map((l) => (l.includes('<a ') ? fixLinks(l) : l));
};

const report = [];
for (const route of cfg.articleRoutes) {
  const slug = route.replaceAll('/', '');
  let e = manifest.entries.find((x) => x.slug === slug && x.status === 'publish' && x.type === 'post');
  if (!e) { report.push({ route, ported: false, why: 'no published post in export' }); continue; }
  const file = `src/pages${route}index.astro`;
  const src = readFileSync(file, 'utf8');
  // Externally hosted images (e.g. googleusercontent) are never fetched, so each one is unrecovered media too.
  // Image tags that the export stores multiply entity-encoded would render as literal markup: drop them and count their files as unrecovered media.
  const unescape = (h) => { for (let n = 0; n < 12 && /&(amp|lt|gt|quot);/.test(h); n++) h = h.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'); return h; };
  const encodedImgs = e.blocks.filter((b) => b.t === 'p' && /^<img\s/i.test(unescape(b.html).trim())).map((b) => unescape(b.html).match(/\ssrc="([^"]+)"/)?.[1]).filter(Boolean);
  e = { ...e, blocks: e.blocks.filter((b) => !(b.t === 'p' && /^<img\s/i.test(unescape(b.html).trim()))) };
  const externalImages = [...new Set([...e.images.filter((i) => i.kind === 'external').map((i) => i.src), ...encodedImgs].map((u) => decodeURIComponent(u.split('/').pop())))];
  const missingMedia = [...e.uploadRefs.filter((u) => !exists(u)), ...externalImages];
  const embeds = e.embeds.map(yt);
  const sealed = missingMedia.length === 0 && embeds.length === 0 && src.includes('<p class="muted">');
  const lines = render(e);
  if (embeds.length) lines.push(...embeds.map((u) => `    <p>Video referenced by the original article: <a href="${attr(u)}" rel="noopener">${attr(u)}</a></p>`));
  const hasArticle = src.includes('<article>');
  const hasByline = src.includes('<p class="muted">');
  const anchor = hasByline ? src.indexOf('<p class="muted">') : src.indexOf('</h1>');
  const bylineEnd = src.indexOf(hasByline ? '</p>' : '</h1>', anchor) + (hasByline ? 4 : 5);
  const tail = hasArticle ? src.indexOf('  </article>') : src.indexOf('</Base>');
  let head = src.slice(0, bylineEnd);
  // Keep the repo's existing editorial "historical article" notice (a reviewed hedge on health/commercial copy; it is not original page text).
  const notice = src.slice(bylineEnd, tail).match(/\n\s*(<p>This is a historical article[\s\S]*?<\/p>)/);
  if (notice) lines.unshift(`    ${notice[1]}`);
  const desc = e.seoDescription.trim();
  head = head.replace(/<!--\s*scaffold:[\s\S]*?-->\n?/, sealed ? '' : `<!-- scaffold: kept (Block 63). Exact body text is ported from the 2026-10-19 WordPress export (docs/migration/55-block63-wxr-recovery.md). Still missing: ${missingMedia.length ? `${missingMedia.length} image binar${missingMedia.length === 1 ? 'y' : 'ies'} (${missingMedia.map((m) => m.split('/').pop()).join(', ')}) not present in the export` : ''}${missingMedia.length && embeds.length ? '; ' : ''}${embeds.length ? 'the original inline video embed (rendered as a plain link, not an iframe)' : ''}${!missingMedia.length && !embeds.length ? 'the on-page author/date byline as originally displayed (not evidenced by the export)' : ''}. -->\n`);
  if (desc && !/<Base[^>]*\sdescription=/.test(head)) head = head.replace(/<Base\s/, `<Base description="${attr(desc)}" `);
  if (sealed) head = head.replace(/(<Base\b[^>]*?)\sscaffold>/, '$1>');
  writeFileSync(file, `${head}\n\n${lines.join('\n')}\n${src.slice(tail)}`);
  report.push({ route, ported: true, cleared: sealed, missingMedia, embeds, desc: !!desc });
}

// Non-article pages: whole body regenerated from the export; the existing <Base> opening tag and <h1> (pinned by earlier tests) are kept.
const PAGES = ['nitro-coffee-kegs', 'nitro-coffee-questions', 'about', 'howtobuy'];
const faqGroups = manifest.entries.filter((x) => x.type === 'wpsm_faq_r');
const pageReport = [];
for (const slug of PAGES) {
  const route = `/${slug}/`;
  const e = manifest.entries.find((x) => x.slug === slug && x.status === 'publish' && x.type === 'page');
  const file = `src/pages${route}index.astro`;
  const src = readFileSync(file, 'utf8');
  const baseOpen = src.indexOf('<Base');
  const baseEnd = src.indexOf('>\n', baseOpen) + 2;
  const h1 = src.match(/\n\s*<h1>[\s\S]*?<\/h1>/)[0].trim();
  const missingMedia = e.uploadRefs.filter((u) => !exists(u));
  const pdfs = (e.type === 'page' && slug === 'nitro-coffee-questions' ? faqGroups.flatMap((g) => g.faqs.flatMap((f) => f.links.filter((l) => l.kind === 'upload').map((l) => l.path))) : []);
  const lines = render(e, slug === 'nitro-coffee-questions' ? faqGroups : [], h1.replace(/<[^>]+>/g, '').trim().toLowerCase()).map((l) => l.replace(/^  /, ''));
  let open = src.slice(src.indexOf('---\n', 4) + 4, baseEnd);
  open = open.replace(/<!--\s*scaffold[\s\S]*?-->\n?/, `<!-- scaffold: kept (Block 63). Exact body text is ported from the 2026-10-19 WordPress export (docs/migration/data/block63-wxr-evidence.json). Still missing: ${[missingMedia.length ? `${missingMedia.length} referenced image binaries (not in the repo or the export)` : '', pdfs.length ? 'the downloadable brochure file (link not rendered: binary not in the repo)' : ''].filter(Boolean).join('; ') || 'nothing further evidenced'}. -->\n`);
  const desc = e.seoDescription.trim();
  if (desc && !/<Base[^>]*\sdescription=/.test(open)) open = open.replace(/<Base\s/, `<Base description="${attr(desc)}" `);
  writeFileSync(file, `---\n${src.slice(4, src.indexOf('---\n', 4))}---\n${open}  ${h1}\n${lines.join('\n')}\n</Base>\n`);
  if (lines.some((l) => l.includes('commerceHref(')) && !src.includes('commerceHref')) {
    const fm = readFileSync(file, 'utf8');
    writeFileSync(file, fm.replace("import Base from", "import { commerceHref } from '../../lib/commerce.mjs';\nimport Base from"));
  }
  pageReport.push({ route, missingMedia, pdfs });
  cfg.nonArticleScaffold.remaining[route] = `exact body text ported from the 2026-10-19 WordPress export (Block 63); still missing: ${[missingMedia.length ? `${missingMedia.length} image binaries referenced by the export are not in the repo or the export (${missingMedia.slice(0, 6).map((m) => m.split('/').pop()).join(', ')}${missingMedia.length > 6 ? ', …' : ''})` : '', pdfs.length ? `the downloadable PDF ${pdfs.map((x) => x.split('/').pop()).join(', ')} is not in the repo (link not rendered)` : ''].filter(Boolean).join('; ') || 'on-page details not evidenced by the export'}`;
}

// Keep the Block 28 article-scaffold contract (qa/qa.config.json) in step with what the port actually achieved.
const a = cfg.articleScaffold;
for (const r of report) {
  if (!r.ported) continue;
  if (r.cleared) {
    delete a.remaining[r.route];
    if (!a.cleared.includes(r.route)) a.cleared.push(r.route);
  } else if (r.route in a.remaining) {
    const why = [];
    if (r.missingMedia.length) why.push(`${r.missingMedia.length} image binar${r.missingMedia.length === 1 ? 'y' : 'ies'} referenced by the 2026-10-19 WordPress export ${r.missingMedia.length === 1 ? 'is' : 'are'} not in the repo or the export (${r.missingMedia.map((m) => m.split('/').pop()).join(', ')})`);
    if (r.embeds.length) why.push(`the original inline video embed (${r.embeds.join(', ')}) is rendered only as a plain link`);
    if (!why.length) why.push('the on-page author/date byline as originally displayed is not evidenced by the export');
    a.remaining[r.route] = `exact body text ported from the 2026-10-19 WordPress export (Block 63); still missing: ${why.join('; ')}`;
  }
}
writeFileSync('qa/qa.config.json', `${JSON.stringify(cfg, null, 2)}\n`);
console.log(JSON.stringify({ report, pageReport, droppedLinks: [...new Set(droppedLinks)] }, null, 1));
