// Minimal strict XML well-formedness parser (dependency-free), sufficient for sitemap.xml.
// Rejects: unclosed/mismatched tags, multiple/no root, unquoted or duplicate attributes,
// stray `&`/`<`, DOCTYPE/entity declarations, content outside the root element.
// Returns { name, attrs, children, text } for the root element; throws Error on malformed input.
const NAME = /[A-Za-z_][\w.\-:]*/y;
const ENTITY = /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/y;
const decode = (s) =>
  s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (_, e) => {
    if (e === 'amp') return '&';
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });

export const parseXml = (input) => {
  const src = input.replace(/^﻿/, '');
  let i = 0;
  const fail = (m) => { throw new Error(`${m} (offset ${i})`); };
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const name = () => { NAME.lastIndex = i; const m = NAME.exec(src); if (!m) fail('expected a name'); i = NAME.lastIndex; return m[0]; };
  const skipMisc = () => {
    for (;;) {
      ws();
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        if (end < 0) fail('unterminated comment');
        if (src.slice(i + 4, end).includes('--')) fail('"--" inside comment');
        i = end + 3;
      } else if (src.startsWith('<?', i)) {
        const end = src.indexOf('?>', i + 2);
        if (end < 0) fail('unterminated processing instruction');
        i = end + 2;
      } else return;
    }
  };
  const text = (stop) => {
    const start = i;
    while (i < src.length && src[i] !== '<') {
      if (src[i] === '&') { ENTITY.lastIndex = i; if (!ENTITY.test(src)) fail('invalid entity reference'); i = ENTITY.lastIndex; } else i++;
    }
    const t = src.slice(start, i);
    if (t.includes(']]>')) fail('"]]>" in text');
    if (i >= src.length && !stop) fail('unexpected end of document');
    return decode(t);
  };
  const element = () => {
    if (src[i] !== '<') fail('expected element');
    i++;
    const tag = name();
    const attrs = {};
    for (;;) {
      const before = i; ws();
      if (src[i] === '>' || src.startsWith('/>', i)) break;
      if (i === before) fail('expected whitespace before attribute');
      const an = name(); ws();
      if (src[i] !== '=') fail('attribute without value'); i++; ws();
      const q = src[i];
      if (q !== '"' && q !== "'") fail('unquoted attribute value'); i++;
      const end = src.indexOf(q, i);
      if (end < 0) fail('unterminated attribute value');
      const raw = src.slice(i, end);
      if (raw.includes('<')) fail('"<" in attribute value');
      if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(raw)) fail('invalid entity reference in attribute');
      if (an in attrs) fail(`duplicate attribute ${an}`);
      attrs[an] = decode(raw); i = end + 1;
    }
    const node = { name: tag, attrs, children: [], text: '' };
    if (src.startsWith('/>', i)) { i += 2; return node; }
    i++; // '>'
    for (;;) {
      node.text += text(false);
      if (src.startsWith('</', i)) {
        i += 2; const close = name(); ws();
        if (src[i] !== '>') fail('malformed end tag'); i++;
        if (close !== tag) fail(`mismatched end tag </${close}> for <${tag}>`);
        return node;
      }
      if (src.startsWith('<!--', i) || src.startsWith('<?', i)) skipMisc();
      else if (src.startsWith('<![CDATA[', i)) {
        const end = src.indexOf(']]>', i);
        if (end < 0) fail('unterminated CDATA');
        node.text += src.slice(i + 9, end); i = end + 3;
      } else if (src.startsWith('<!', i)) fail('unsupported markup declaration');
      else node.children.push(element());
    }
  };

  if (src.startsWith('<?xml', i)) { const end = src.indexOf('?>', i); if (end < 0) fail('unterminated XML declaration'); i = end + 2; }
  skipMisc();
  if (src.startsWith('<!', i)) fail('DOCTYPE / declarations are not allowed');
  const root = element();
  skipMisc();
  if (i < src.length) fail('content after the root element');
  return root;
};
