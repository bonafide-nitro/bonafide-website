// Unsupported review/rating JSON-LD detection (Block 30, Issue #80; master plan decision I7/D7).
// Terms are expanded against the node's @context to schema.org IRIs *before* comparison, so
// bare, absolute (https/http) and prefixed (e.g. schema:Review) spellings are all caught while
// unrelated or non-schema.org vocabularies are not (no substring matching).
const BANNED_TYPES = new Set(['Review', 'AggregateRating', 'Rating']);
const BANNED_PROPS = new Set(['review', 'reviewRating', 'aggregateRating']);

const SCHEMA_CONTEXT = /^https?:\/\/(?:www\.)?schema\.org(?:\/(?:docs\/jsonldcontext\.jsonld?)?)?$/i;
const SCHEMA_IRI = /^https?:\/\/(?:www\.)?schema\.org\/([^/#?]+)$/;
const ABSOLUTE = /^[a-z][a-z0-9+.-]*:\/\//i;

const isSchemaContextString = (s) => typeof s === 'string' && SCHEMA_CONTEXT.test(s.trim());

// Merge an @context value (string | object | array) into a context state {vocab, terms}.
const EMPTY_STATE = { vocab: undefined, terms: new Map(), meta: new Map() }; // no @context seen: bare terms default to schema.org
const NULL_STATE = { vocab: null, terms: new Map(), meta: new Map() }; // @context: null: no vocabulary, bare terms mean nothing
const applyContext = (state, ctx) => {
  if (ctx === undefined) return state;
  if (ctx === null) return NULL_STATE; // null context removes the active context (JSON-LD 1.1)
  if (Array.isArray(ctx)) return ctx.reduce(applyContext, state);
  if (typeof ctx === 'string') return isSchemaContextString(ctx) ? { ...state, vocab: 'https://schema.org/' } : state;
  if (typeof ctx !== 'object') return state;
  const next = { vocab: state.vocab, terms: new Map(state.terms), meta: new Map(state.meta) };
  if (typeof ctx['@vocab'] === 'string') next.vocab = ctx['@vocab'];
  if (ctx['@vocab'] === null) next.vocab = null;
  for (const [k, v] of Object.entries(ctx)) {
    if (k.startsWith('@')) continue;
    // null (or {"@id": null}) explicitly decouples the term from any inherited IRI (JSON-LD 1.1).
    if (v === null || (typeof v === 'object' && !Array.isArray(v) && v['@id'] === null)) {
      next.terms.set(k, null);
      next.meta.delete(k);
      continue;
    }
    const def = v && typeof v === 'object' && !Array.isArray(v) ? v : null;
    // @reverse term definitions name the (banned) property IRI just like @id does.
    const id = typeof v === 'string' ? v : def && typeof def['@id'] === 'string' ? def['@id'] : def && typeof def['@reverse'] === 'string' ? def['@reverse'] : null;
    if (id) next.terms.set(k, id);
    // Container mapping and property-scoped @context belong to the term definition (JSON-LD 1.1).
    if (def) next.meta.set(k, { container: [].concat(def['@container'] ?? []), context: def['@context'] });
    else next.meta.delete(k);
  }
  return next;
};

// Expand one term to an absolute IRI (or null when it has no IRI meaning here).
const expand = (term, state, depth = 0) => {
  if (typeof term !== 'string' || !term || term.startsWith('@') || depth > 8) return null;
  if (ABSOLUTE.test(term)) return term;
  if (state.terms.has(term)) {
    const target = state.terms.get(term);
    return target === null || target === term ? null : expand(target, state, depth + 1);
  }
  const i = term.indexOf(':');
  if (i > 0) {
    const prefix = term.slice(0, i);
    if (state.terms.has(prefix)) {
      if (state.terms.get(prefix) === null) return null;
      const base = expand(state.terms.get(prefix), state, depth + 1);
      return base ? base + term.slice(i + 1) : null;
    }
    return null; // undefined prefix: not schema.org
  }
  // Bare term: schema.org unless a non-schema.org @vocab is explicitly declared.
  if (state.vocab === null) return null;
  if (state.vocab !== undefined && !SCHEMA_IRI.test(`${state.vocab}x`)) return null;
  return `https://schema.org/${term}`;
};

// Keyword a node key denotes: itself when it is a keyword, or the keyword it is aliased to in the context
// (following alias chains, e.g. a -> t -> @type).
const keywordOf = (key, state) => {
  let cur = key;
  for (let depth = 0; depth <= 8; depth += 1) {
    if (cur.startsWith('@')) return cur;
    const target = state.terms.get(cur);
    if (typeof target !== 'string' || target === cur) return null;
    cur = target;
  }
  return null;
};

// Node-bearing keywords whose values are (lists of) nodes or property maps of the same node.
const TRAVERSED_KEYWORDS = new Set(['@graph', '@included', '@nest', '@reverse', '@list', '@set']);

const schemaName = (iri) => (iri ? SCHEMA_IRI.exec(iri)?.[1] ?? null : null);

// Returns [{ kind: 'type' | 'property', term, name }] for every unsupported review/rating term in a parsed JSON-LD value.
export const findReviewRatingTerms = (data) => {
  const found = [];
  const visit = (node, parent) => {
    if (Array.isArray(node)) return node.forEach((n) => visit(n, parent));
    if (!node || typeof node !== 'object') return;
    const state = applyContext(parent, node['@context']);
    for (const [k, v] of Object.entries(node)) {
      const kw = keywordOf(k, state);
      if (kw === '@context') continue;
      if (kw === '@type') {
        for (const t of [].concat(v ?? [])) {
          const name = schemaName(expand(t, state));
          if (name && BANNED_TYPES.has(name)) found.push({ kind: 'type', term: t, name });
        }
        continue;
      }
      if (kw === null) {
        const name = schemaName(expand(k, state));
        if (name && BANNED_PROPS.has(name)) found.push({ kind: 'property', term: k, name });
      }
      if (kw !== null) {
        if (TRAVERSED_KEYWORDS.has(kw)) visit(v, state);
        continue;
      }
      const meta = state.meta.get(k);
      const valueState = meta && meta.context !== undefined ? applyContext(state, meta.context) : state;
      const containers = meta ? meta.container : [];
      if (v && typeof v === 'object' && !Array.isArray(v) && containers.some((c) => ['@index', '@language', '@id', '@type'].includes(c)) && !containers.includes('@graph')) {
        // Map container: the labels are indexes / languages / ids / types, never properties.
        for (const [label, val] of Object.entries(v)) {
          if (containers.includes('@type')) {
            const name = schemaName(expand(label, valueState));
            if (name && BANNED_TYPES.has(name)) found.push({ kind: 'type', term: label, name });
          }
          visit(val, valueState);
        }
      } else visit(v, valueState);
    }
  };
  visit(data, EMPTY_STATE);
  return found;
};
