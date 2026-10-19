#!/usr/bin/env node
// Block 63 — offline WordPress WXR export -> sanitized per-route evidence (Issue #143).
// Reads ONE local WXR file, makes no network request, writes nothing but the paths it is given.
// Only titles, SEO title/description, dates, headings, text blocks, link targets and image
// references are extracted. Author accounts/emails, private post meta, comments, form entries,
// scripts, iframes, inline handlers, styles and page-builder JSON are never carried over.
import { readFileSync, writeFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';

const HOSTS = new Set(['bonafidenitro.com', 'www.bonafidenitro.com']);
const cdata = (s) => s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
const tag = (item, name) => {
  const m = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? cdata(m[1].trim()) : '';
};
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', copy: '©', reg: '®', trade: '™', deg: '°', eacute: 'é', egrave: 'è', euro: '€', bull: '•' };
export const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') {
    const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
  }
  return ENT[e.toLowerCase()] ?? m;
});
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

// Personal/private mailbox addresses inside page copy are not carried into the repo evidence.
const redact = (t) => t.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => (m.toLowerCase() === 'contact@bonafidenitro.com' ? m : '[email redacted]'));

export function classifyHref(raw, routes) {
  const href = decode(raw.trim());
  if (!href) return { kind: 'empty' };
  if (href.startsWith('#')) return { kind: 'fragment', href };
  let u;
  try { u = new URL(href, 'https://bonafidenitro.com/'); } catch { return { kind: 'invalid' }; }
  if (!['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol)) return { kind: 'unsafe-scheme' };
  if (u.protocol === 'mailto:' || u.protocol === 'tel:') return { kind: u.protocol.slice(0, -1), href: u.href };
  if (HOSTS.has(u.hostname)) {
    const p = u.pathname.endsWith('/') || /\.[a-z0-9]+$/i.test(u.pathname) ? u.pathname : `${u.pathname}/`;
    if (p.startsWith('/wp-content/uploads/')) return { kind: 'upload', path: decodeURI(u.pathname) };
    if (p === '/' || routes.has(p)) return { kind: 'internal', path: p + (u.hash ?? '') };
    return { kind: 'internal-unrouted', path: u.pathname };
  }
  return { kind: 'external', href: u.href, host: u.hostname };
}

// Sanitized block model: {t:'h',l,html} {t:'p',html} {t:'ul'|'ol',items:[html]} {t:'img',src,alt} {t:'quote',html}
export function parseContent(html, routes) {
  const stats = { shortcodes: 0, removedScripts: 0, removedIframes: 0, removedForms: 0, removedConfigBlocks: 0 };
  // Media/embed references anywhere in the raw markup (incl. page-builder widget JSON), recorded as data only.
  const flat = decode(html).replace(/\\\//g, '/').replace(/&quot;/g, '"');
  const uploadRefs = [...new Set([...flat.matchAll(/(?:https?:)?\/\/(?:www\.)?bonafidenitro\.com(\/wp-content\/uploads\/[^\s"'<>\\)]+)/gi)].map((x) => decodeURI(x[1])))].sort();
  const embedHosts = [...new Set([...flat.matchAll(/https?:\/\/(?:www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com|facebook\.com|instagram\.com)\/[^\s"'<>\\]*/gi)].map((x) => x[0]))].sort();
  let s = html.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, () => { stats.removedScripts++; return ''; });
  s = s.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, () => { stats.removedIframes++; return ''; });
  s = s.replace(/<form\b[\s\S]*?<\/form>/gi, () => { stats.removedForms++; return ''; });
  s = s.replace(/<input\b[^>]*>/gi, '');
  s = s.replace(/\[\/?[a-z_][a-z0-9_-]*(?:\s[^\]]*)?\]/gi, () => { stats.shortcodes++; return ' '; });
  const blocks = [];
  const links = [];
  const images = [];
  let inline = '';
  let list = null;
  let listItem = null;
  let open = null; // current text container: {t,l}
  const anchors = [];
  const hrefs = [];
  const flush = () => {
    const text = redact(inline.replace(/[\u200b\u200c\u200d\ufeff]/g, '').replace(/<(strong|em)>\s*<\/\1>/g, '').replace(/(\s|&#160;)+/g, ' ').replace(/<(strong|em)> /g, ' <$1>').replace(/ <\/(strong|em)>/g, '</$1> ')).trim();
    inline = '';
    const plain = decode(text.replace(/<[^>]+>/g, '')).replace(/[\s ]+/g, '');
    if (!plain) { open = null; return; }
    // Page-builder/Thrive configuration that leaked into text (JSON/CSS objects): data, not page copy.
    if (/^[{\[]|[{\[]\s*(?:&quot;|")[\w@ -]+(?:&quot;|")\s*:/.test(decode(text.replace(/&#12[35];/g, (c) => (c === '&#123;' ? '{' : '}'))))) { stats.removedConfigBlocks++; open = null; return; }
    if (list) { list.items.push(text); }
    else if (open?.t === 'h') blocks.push({ t: 'h', l: open.l, html: text });
    else if (open?.t === 'quote') blocks.push({ t: 'quote', html: text });
    else blocks.push({ t: 'p', html: text });
    open = null;
  };
  const re = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>|([^<]+)/gi;
  let m;
  while ((m = re.exec(s))) {
    if (m[4] !== undefined) { inline += esc(decode(m[4])); continue; }
    const close = m[1] === '/';
    const name = m[2].toLowerCase();
    const attrs = m[3] ?? '';
    const attr = (n) => { const a = attrs.match(new RegExp(`\\b${n}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return a ? (a[2] ?? a[3]) : null; };
    if (/^h[1-6]$/.test(name)) { if (!close) { flush(); open = { t: 'h', l: Number(name[1]) }; } else flush(); continue; }
    if (name === 'blockquote') { if (!close) { flush(); open = { t: 'quote' }; } else flush(); continue; }
    if (name === 'p' || name === 'div' || name === 'section' || name === 'article' || name === 'tr' || name === 'table') { flush(); continue; }
    if (name === 'br') { flush(); continue; } // line break inside a paragraph/list item -> separate block
    if (name === 'ul' || name === 'ol') {
      if (!close) { flush(); if (list) blocks.push({ t: list.t, items: list.items }); list = { t: name, items: [] }; }
      else { flush(); if (list?.items.length) blocks.push({ t: list.t, items: list.items }); list = null; }
      continue;
    }
    if (name === 'li') { flush(); continue; }
    if (name === 'td' || name === 'th') { inline += ' '; continue; }
    if (name === 'strong' || name === 'b') { inline += close ? '</strong>' : '<strong>'; continue; }
    if (name === 'em' || name === 'i') { inline += close ? '</em>' : '<em>'; continue; }
    if (name === 'a') {
      if (close) { hrefs.pop(); inline += anchors.pop() ? '</a>' : ''; continue; }
      const c = classifyHref(attr('href') ?? '', routes);
      links.push(c);
      let keep = false;
      if (c.kind === 'internal') { inline += `<a href="${escAttr(c.path)}">`; keep = true; }
      else if (c.kind === 'external') { inline += `<a href="${escAttr(c.href)}" rel="noopener">`; keep = true; }
      else if (c.kind === 'mailto' || c.kind === 'tel') { inline += `<a href="${escAttr(c.href)}">`; keep = true; }
      anchors.push(keep);
      hrefs.push(keep ? (c.kind === 'internal' ? c.path : c.href) : null);
      continue;
    }
    if (name === 'img' && !close) {
      const src = attr('src') ?? '';
      const c = classifyHref(src, routes);
      const img = { src: c.kind === 'upload' ? c.path : decode(src), alt: attr('alt') === null ? null : decode(attr('alt')), kind: c.kind };
      images.push(img);
      if (c.kind === 'upload' && !list) {
        flush();
        blocks.push({ t: 'img', src: img.src, alt: img.alt, width: Number(attr('width')) || null, height: Number(attr('height')) || null, ...(hrefs.at(-1) ? { href: hrefs.at(-1) } : {}) });
      }
      continue;
    }
  }
  flush();
  return { blocks, links, images, uploadRefs, embeds: embedHosts, stats };
}

export function parseWxr(xml, routes) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const attachments = new Map();
  const entries = [];
  for (const it of items) {
    const type = tag(it, 'wp:post_type');
    if (type === 'attachment') {
      const url = tag(it, 'wp:attachment_url');
      const alt = [...it.matchAll(/<wp:meta_key>(?:<!\[CDATA\[)?_wp_attachment_image_alt[\s\S]*?<wp:meta_value>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_value>/g)][0]?.[1] ?? '';
      attachments.set(url, { alt: decode(alt.trim()), title: decode(tag(it, 'title')) });
      continue;
    }
    if (type === 'wpsm_faq_r') {
      // FAQ accordion groups live in serialized post meta: keep only question text and sanitized answer blocks.
      const raw = (it.match(/wpsm_faq_data\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>/) ?? [])[1] ?? '';
      const faqs = [...raw.matchAll(/"faq_title";s:\d+:"([\s\S]*?)";s:\d+:"faq_title_icon"[\s\S]*?"faq_desc";s:\d+:"([\s\S]*?)";\}/g)].map((x) => ({ question: decode(x[1]).trim(), answer: parseContent(x[2], routes) }));
      entries.push({ slug: tag(it, 'wp:post_name'), type, status: tag(it, 'wp:status'), date: '', modified: '', title: decode(tag(it, 'title')), seoTitle: '', seoDescription: '', categories: [], blocks: [], links: [], images: [], uploadRefs: [], embeds: [], stats: {}, faqs: faqs.map((f) => ({ question: f.question, blocks: f.answer.blocks, links: f.answer.links.filter((l) => l.kind !== 'empty'), uploadRefs: f.answer.uploadRefs })) });
      continue;
    }
    if (type !== 'page' && type !== 'post') continue;
    const meta = (key) => {
      const m = it.match(new RegExp(`<wp:meta_key>(?:<!\\[CDATA\\[)?${key}(?:\\]\\]>)?</wp:meta_key>\\s*<wp:meta_value>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</wp:meta_value>`));
      return m ? decode(m[1].trim()) : '';
    };
    const slug = tag(it, 'wp:post_name');
    entries.push({
      slug, type, status: tag(it, 'wp:status'), date: tag(it, 'wp:post_date').slice(0, 10), modified: tag(it, 'wp:post_modified').slice(0, 10),
      title: decode(tag(it, 'title')), seoTitle: meta('_aioseop_title'), seoDescription: meta('_aioseop_description'),
      categories: [...it.matchAll(/<category domain="category" nicename="([^"]+)"/g)].map((x) => x[1]),
      ...parseContent(tag(it, 'content:encoded'), routes),
    });
  }
  return { entries, attachments };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const input = arg('--wxr'); const out = arg('--out');
  if (!input || !out) { console.error('error: usage: node scripts/wxr-extract.mjs --wxr <file.xml> --out <manifest.json>'); process.exit(2); }
  const st = lstatSync(input);
  if (!st.isFile()) { console.error('error: input is not a regular file'); process.exit(2); }
  const { readdirSync } = await import('node:fs');
  const routes = new Set(['/']);
  for (const d of readdirSync('src/pages', { withFileTypes: true })) if (d.isDirectory()) routes.add(`/${d.name}/`);
  const routedOnly = args.includes('--routed-only');
  const { entries: all, attachments } = parseWxr(readFileSync(input, 'utf8'), routes);
  const entries = routedOnly ? all.filter((e) => e.status === 'publish' && (e.type === 'wpsm_faq_r' || routes.has(`/${e.slug}/`))) : all;
  const manifest = {
    note: routedOnly ? 'Sanitized per-route evidence extracted offline by scripts/wxr-extract.mjs from published pages/posts that have an Astro route. No author accounts, private post meta, comments, form entries, scripts, iframes, styles or page-builder JSON. Not a media backup.' : undefined,
    source: 'WordPress WXR export dated 2026-10-19 (owner-supplied); current WP source evidence, not verified historical source and not an image backup',
    entries: entries.map((e) => ({
      slug: e.slug, type: e.type, status: e.status, date: e.date, modified: e.modified, title: e.title,
      seoTitle: e.seoTitle, seoDescription: e.seoDescription, categories: e.categories,
      blocks: e.blocks,
      links: e.links.filter((l) => l.kind !== 'empty'),
      images: e.images.map((i) => ({ ...i, alt: i.alt ?? null })),
      uploadRefs: e.uploadRefs, embeds: e.embeds,
      removed: e.stats,
      ...(e.faqs ? { faqs: e.faqs } : {}),
    })),
    attachmentAlt: Object.fromEntries([...attachments].filter(([, v]) => v.alt).map(([k, v]) => [k.replace(/^https?:\/\/[^/]+/, ''), v.alt])),
  };
  writeFileSync(resolve(out), `${JSON.stringify(manifest, null, 1)}\n`);
  console.log(`entries: ${manifest.entries.length}`);
}
