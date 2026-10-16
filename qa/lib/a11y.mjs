// Nonvisual accessibility / functional-HTML audit of one generated page. Dependency-free and regex-based like
// qa/lib/html.mjs (Astro's static output is well-formed). It reports only high-signal structural defects; it never
// judges alt-text wording, contrast or layout, and it has no allowlist.
import { decodeEntities, normText } from './html.mjs';

const stripNoise = (raw) => raw.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, ' ');

const parseAttrs = (raw) => {
  const attrs = {};
  for (const m of raw.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const k = m[1].toLowerCase();
    if (!(k in attrs)) attrs[k] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
};

const present = (v) => typeof v === 'string' && v.trim() !== '';
const textOf = (inner) => normText(inner.replace(/<[^>]*>/g, ' '));
const idTokens = (v) => (v ?? '').split(/\s+/).filter(Boolean);

// Does an element's inner HTML provide an accessible name? Visible text, a labelled/titled/alt-bearing descendant.
const innerName = (inner) => {
  if (textOf(inner) !== '') return true;
  for (const m of inner.matchAll(/<(img|svg|input)\b([^>]*)>/gi)) {
    const a = parseAttrs(m[2]);
    if (m[1].toLowerCase() === 'img' && present(a.alt)) return true;
    if (m[1].toLowerCase() === 'input' && present(a.value)) return true;
    if (present(a['aria-label'])) return true;
  }
  return /<svg\b[^>]*>[\s\S]*?<title\b[^>]*>\s*\S[\s\S]*?<\/title>/i.test(inner);
};

export const auditHtml = (rawHtml) => {
  const findings = [];
  const add = (code, message) => findings.push({ code, message });
  const html = stripNoise(rawHtml);

  const htmlTag = html.match(/<html\b([^>]*)>/i);
  if (!htmlTag || !present(parseAttrs(htmlTag[1]).lang)) add('html-lang', '<html> has no non-empty lang attribute');

  const mains = [...html.matchAll(/<main\b([^>]*)>/gi)].length + [...html.matchAll(/<[a-z][^>]*\brole\s*=\s*["']main["'][^>]*>/gi)].length;
  if (mains !== 1) add('main-landmark', `expected exactly one main landmark, found ${mains}`);

  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1s.length !== 1) add('h1-count', `expected exactly one <h1>, found ${h1s.length}`);
  else if (textOf(h1s[0][1]) === '' && !innerName(h1s[0][1])) add('h1-empty', '<h1> has no accessible text');

  // ids
  const idCount = new Map();
  const ids = new Set();
  const names = new Set();
  for (const m of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const a = parseAttrs(m[2]);
    if (present(a.id)) { idCount.set(a.id, (idCount.get(a.id) ?? 0) + 1); ids.add(a.id); }
    if (m[1].toLowerCase() === 'a' && present(a.name)) names.add(a.name);
  }
  for (const [id, n] of idCount) if (n > 1) add('duplicate-id', `id="${id}" is used ${n} times`);

  // aria references
  for (const m of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const a = parseAttrs(m[2]);
    for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      for (const t of idTokens(a[attr])) if (!ids.has(t)) add('aria-ref', `<${m[1].toLowerCase()} ${attr}="${t}"> references a missing id`);
    }
  }

  // links
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const a = parseAttrs(m[1]);
    if (a.href === undefined) continue;
    if (!present(a['aria-label']) && !present(a['aria-labelledby']) && !innerName(m[2])) add('link-name', `link to "${a.href}" has no accessible name`);
    if (a.href.startsWith('#') && a.href.length > 1) {
      const frag = (() => { try { return decodeURIComponent(a.href.slice(1)); } catch { return a.href.slice(1); } })();
      if (frag !== 'top' && !ids.has(frag) && !names.has(frag)) add('fragment-target', `same-page link "${a.href}" has no matching id`);
    }
  }

  // images
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const a = parseAttrs(m[1]);
    if (a.alt === undefined && a.role !== 'presentation' && a.role !== 'none') add('img-alt', `<img src="${a.src ?? ''}"> has no alt attribute`);
  }

  // buttons, iframes
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const a = parseAttrs(m[1]);
    if (!present(a['aria-label']) && !present(a['aria-labelledby']) && !present(a.title) && !innerName(m[2])) add('button-name', '<button> has no accessible name');
  }
  for (const m of html.matchAll(/<iframe\b([^>]*)>/gi)) {
    const a = parseAttrs(m[1]);
    if (!present(a.title) && !present(a['aria-label'])) add('iframe-title', `<iframe src="${a.src ?? ''}"> has no title`);
  }

  // form controls and labels
  const labels = [...html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)].map((m) => ({ attrs: parseAttrs(m[1]), inner: m[2] }));
  const labelFor = new Set();
  for (const l of labels) {
    if (l.attrs.for !== undefined) {
      if (!ids.has(l.attrs.for)) add('label-for', `<label for="${l.attrs.for}"> references a missing id`);
      else labelFor.add(l.attrs.for);
    }
  }
  const wrapped = (re) => labels.some((l) => l.attrs.for === undefined && re.test(l.inner) && textOf(l.inner) !== '');
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const a = parseAttrs(m[2]);
    const type = (a.type ?? 'text').toLowerCase();
    if (m[1].toLowerCase() === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) {
      if (type === 'image' && !present(a.alt)) add('input-image-alt', '<input type="image"> has no alt');
      continue;
    }
    const named = present(a['aria-label']) || present(a['aria-labelledby']) || present(a.title) || (present(a.id) && labelFor.has(a.id));
    if (!named && !wrapped(new RegExp(`<${m[1]}\\b[^>]*${a.name ? `name\\s*=\\s*["']${a.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']` : ''}`, 'i'))) {
      add('control-label', `<${m[1].toLowerCase()}${a.name ? ` name="${a.name}"` : ''}${a.id ? ` id="${a.id}"` : ''}> has no associated label`);
    }
  }
  return findings;
};
