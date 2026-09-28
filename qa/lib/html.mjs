// Minimal, dependency-free HTML extraction for the QA runner. Astro's static output is
// well-formed, so regex extraction is sufficient; nothing here executes page code.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export const decodeEntities = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

// Text comparison form: decoded entities, curly quotes folded, whitespace collapsed.
export const normText = (s) =>
  decodeEntities(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

const parseAttrs = (raw) => {
  const attrs = {};
  for (const m of raw.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
};

const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'gi'))].map((m) => parseAttrs(m[1]));

export const parseHtml = (rawHtml) => {
  const html = stripComments(rawHtml);
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => normText(m[1].replace(/<[^>]*>/g, ' ')));
  const h1Opens = [...html.matchAll(/<h1\b/gi)].length;
  const metas = tags(html, 'meta');
  const links = tags(html, 'link');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => ({ attrs: parseAttrs(m[1]), body: m[2] }));
  const body = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  return {
    title: titleMatch ? normText(titleMatch[1]) : null,
    h1s,
    h1Count: Math.max(h1s.length, h1Opens),
    canonicals: links.filter((l) => (l.rel ?? '').toLowerCase().split(/\s+/).includes('canonical')).map((l) => l.href ?? ''),
    robots: metas.filter((m) => (m.name ?? '').toLowerCase() === 'robots').map((m) => (m.content ?? '').toLowerCase()),
    scaffold: metas.some((m) => (m.name ?? '').toLowerCase() === 'bonafide-qa' && m.content === 'scaffold-placeholder'),
    metaRefresh: metas.some((m) => (m['http-equiv'] ?? '').toLowerCase() === 'refresh'),
    hrefs: tags(html, 'a').map((a) => a.href).filter((h) => h !== undefined),
    scriptSrcs: scripts.map((s) => s.attrs.src).filter(Boolean),
    jsonLd: scripts.filter((s) => (s.attrs.type ?? '').toLowerCase() === 'application/ld+json').map((s) => s.body),
    text: normText(body),
  };
};

// JSON-LD @type values, flattening @graph and arrays.
export const jsonLdTypes = (data) => {
  const out = [];
  const visit = (n) => {
    if (Array.isArray(n)) return n.forEach(visit);
    if (n && typeof n === 'object') {
      if (n['@type']) out.push(...[].concat(n['@type']));
      if (n['@graph']) visit(n['@graph']);
    }
  };
  visit(data);
  return out;
};
