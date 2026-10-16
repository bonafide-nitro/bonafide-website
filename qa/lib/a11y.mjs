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
const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'wbr', 'area', 'col', 'embed', 'track']);

// Remove aria-hidden="true" subtrees: their content is not exposed to assistive technology, so it cannot name anything.
const stripHidden = (inner) => {
  let out = inner;
  for (;;) {
    let cut = null;
    for (const m of out.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
      if (parseAttrs(m[2])['aria-hidden']?.trim().toLowerCase() !== 'true') continue;
      const tag = m[1].toLowerCase();
      let end = m.index + m[0].length;
      if (!VOID.has(tag) && !/\/\s*$/.test(m[2])) {
        let depth = 1;
        const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
        re.lastIndex = end;
        for (let t = re.exec(out); t; t = re.exec(out)) {
          depth += t[1] ? -1 : 1;
          if (!depth) { end = t.index + t[0].length; break; }
        }
        if (depth) end = out.length;
      }
      cut = [m.index, end];
      break;
    }
    if (!cut) return out;
    out = `${out.slice(0, cut[0])} ${out.slice(cut[1])}`;
  }
};
const idTokens = (v) => (v ?? '').split(/\s+/).filter(Boolean);

// Does an element's inner HTML provide an accessible name? Visible text, a labelled/titled/alt-bearing descendant.
const innerName = (rawInner) => {
  const inner = stripHidden(rawInner);
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

  // Count elements, not pattern hits: <main role="main"> is one landmark.
  let mains = 0;
  for (const m of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    if (m[1].toLowerCase() === 'main' || parseAttrs(m[2]).role?.trim().toLowerCase() === 'main') mains++;
  }
  if (mains !== 1) add('main-landmark', `expected exactly one main landmark, found ${mains}`);

  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1s.length !== 1) add('h1-count', `expected exactly one <h1>, found ${h1s.length}`);
  else if (!innerName(h1s[0][1])) add('h1-empty', '<h1> has no accessible text');

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

  // Only a non-empty referenced element can supply an accessible name via aria-labelledby.
  // This is a conservative static check; it does not claim to compute the full accessibility tree.
  const referencedName = (value) => idTokens(value).some((id) => {
    for (const m of html.matchAll(/<([a-z][a-z0-9-]*)\\b([^>]*)>/gi)) {
      if (parseAttrs(m[2]).id !== id) continue;
      const tag = m[1].toLowerCase();
      const after = html.slice(m.index + m[0].length);
      const close = new RegExp(`<\\/\\/\\/\\/${tag}\\s*>`, 'i');
      // Simple textual alternatives of referenced elements (without hidden descendants).
      const end = after.search(new RegExp(`<\\/${tag}\\s*>`, 'i'));
      const content = end < 0 ? '' : after.slice(0, end);
      return innerName(content) || present(parseAttrs(m[2])['aria-label']);
    }
    return false;
  });

  // links
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const a = parseAttrs(m[1]);
    if (a.href === undefined) continue;
    if (!present(a['aria-label']) && !referencedName(a['aria-labelledby']) && !innerName(m[2])) add('link-name', `link to "${a.href}" has no accessible name`);
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
    if (!present(a['aria-label']) && !referencedName(a['aria-labelledby']) && !present(a.title) && !innerName(m[2])) add('button-name', '<button> has no accessible name');
  }
  for (const m of html.matchAll(/<iframe\b([^>]*)>/gi)) {
    const a = parseAttrs(m[1]);
    // Hidden frames (e.g. the GTM noscript tracking pixel) are not exposed to assistive technology.
    const hidden = a['aria-hidden']?.trim().toLowerCase() === 'true' || a.hidden !== undefined || /display\s*:\s*none/i.test(a.style ?? '');
    if (hidden) continue;
    if (!present(a.title) && !present(a['aria-label'])) add('iframe-title', `<iframe src="${a.src ?? ''}"> has no title`);
  }

  // form controls and labels
  const labels = [...html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)]
    .map((m) => ({ attrs: parseAttrs(m[1]), inner: m[2], start: m.index, end: m.index + m[0].length }));
  const labelFor = new Set();
  for (const l of labels) {
    if (l.attrs.for !== undefined) {
      if (!ids.has(l.attrs.for)) add('label-for', `<label for="${l.attrs.for}"> references a missing id`);
      else if (innerName(l.inner)) labelFor.add(l.attrs.for);
    }
  }
  // A control is implicitly labelled only if this very element sits inside a for-less <label> that has text.
  const wrapped = (pos) => labels.some((l) => l.attrs.for === undefined && pos > l.start && pos < l.end && textOf(stripHidden(l.inner)) !== '');
  for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const a = parseAttrs(m[2]);
    const type = (a.type ?? 'text').toLowerCase();
    if (m[1].toLowerCase() === 'input' && ['hidden', 'submit', 'reset', 'image'].includes(type)) {
      if (type === 'image' && !present(a.alt)) add('input-image-alt', '<input type="image"> has no alt');
      continue;
    }
    const named = present(a['aria-label']) || referencedName(a['aria-labelledby']) || present(a.title) || (present(a.id) && labelFor.has(a.id)) || (m[1].toLowerCase() === 'input' && type === 'button' && present(a.value));
    if (!named && !wrapped(m.index)) {
      add('control-label', `<${m[1].toLowerCase()}${a.name ? ` name="${a.name}"` : ''}${a.id ? ` id="${a.id}"` : ''}> has no associated label`);
    }
  }
  return findings;
};
