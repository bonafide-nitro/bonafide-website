// Block 30 (Issue #80, decision I7/D7): unsupported Review/AggregateRating JSON-LD is rejected after schema.org IRI normalisation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { findReviewRatingTerms } from '../../qa/lib/jsonld.mjs';
import { makeFixture, page, jsonLd, run, codes, cleanup } from './fixture.mjs';

const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
const base = ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList'].map((t) => ({ '@type': t }));
const CODE = 'T6:review-rating-schema-unsupported';

const rejected = {
  'bare Review': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'Review' }] },
  'bare AggregateRating': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'AggregateRating' }] },
  'bare reviewRating property': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'WebPage', reviewRating: { '@type': 'Rating' } }] },
  'bare aggregateRating property': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'Organization', aggregateRating: {} }] },
  'absolute https IRI type': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'https://schema.org/Review' }] },
  'absolute http IRI type': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'http://schema.org/AggregateRating' }] },
  'absolute IRI property': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'Organization', 'https://schema.org/aggregateRating': {} }] },
  'absolute http IRI property': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'Organization', 'http://schema.org/reviewRating': {} }] },
  'prefixed type (schema:Review)': { '@context': { schema: 'https://schema.org/' }, '@graph': [...base, { '@type': 'schema:Review' }] },
  'prefixed property (schema:reviewRating)': { '@context': { schema: 'http://schema.org/' }, '@graph': [...base, { '@type': 'schema:WebPage', 'schema:reviewRating': {} }] },
  'prefix with a non-"schema" name': { '@context': { s: 'https://schema.org/' }, '@graph': [...base, { '@type': 's:AggregateRating' }] },
  'prefix in an array context': { '@context': ['https://schema.org', { sdo: 'https://schema.org/' }], '@graph': [...base, { '@type': ['Thing', 'sdo:Review'] }] },
  'term alias to a schema.org IRI': { '@context': { rev: 'https://schema.org/Review' }, '@graph': [...base, { '@type': 'rev' }] },
  'term alias via prefixed @id': { '@context': { schema: 'https://schema.org/', rev: { '@id': 'schema:aggregateRating' } }, '@graph': [...base, { '@type': 'Organization', rev: {} }] },
  'scoped node-level context': { '@context': 'https://schema.org', '@graph': [...base, { '@context': { schema: 'https://schema.org/' }, '@type': 'schema:Review' }] },
  'deeply nested in a property value': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'Product', offers: { '@type': 'Offer', itemReviewed: { '@type': 'Thing', review: { '@type': 'schema:Review' } } } }] },
  'aliased @type keyword': { '@context': { '@vocab': 'https://schema.org/', a: '@type' }, '@graph': [{ a: 'Review' }] },
  'aliased @type keyword with {@id}': { '@context': ['https://schema.org', { t: { '@id': '@type' } }], t: ['Thing', 'AggregateRating'] },
  'node under @included': { '@context': 'https://schema.org', '@included': [{ '@type': 'Review' }] },
  'node under aliased @included': { '@context': { '@vocab': 'https://schema.org/', inc: '@included' }, inc: [{ '@type': 'AggregateRating' }] },
  'context re-established after a null context': { '@context': 'https://schema.org', '@graph': [{ '@context': [null, 'https://schema.org'], '@type': 'Review' }] },
  'top-level array of nodes': [{ '@context': 'https://schema.org', '@type': 'AggregateRating' }],
};
for (const [name, data] of Object.entries(rejected)) {
  test(`normaliser finds: ${name}`, () => assert.ok(findReviewRatingTerms(data).length > 0));
}

const allowed = {
  'standard site graph': { '@context': 'https://schema.org', '@graph': base },
  'prefixed unrelated terms': { '@context': { schema: 'https://schema.org/' }, '@graph': [{ '@type': 'schema:Organization', 'schema:name': 'x' }] },
  'text containing the words review/rating': { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', name: 'Review Rating guide', description: 'AggregateRating Review' }] },
  'unrelated property names that merely contain the substring': { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', reviewedBy: { '@type': 'Person', name: 'x' }, ratingExplanation: 'x', lastReviewed: '2026-01-01' }] },
  'unrelated types that merely contain the substring': { '@context': 'https://schema.org', '@graph': [{ '@type': 'ReviewAction' }, { '@type': 'Reviewer' }] },
  'Review in a different vocabulary (prefix)': { '@context': { ex: 'https://example.com/vocab/' }, '@graph': [{ '@type': 'ex:Review' }] },
  'Review under a non-schema.org @vocab': { '@context': { '@vocab': 'https://example.com/ns/' }, '@graph': [{ '@type': 'Review' }] },
  'Review on a lookalike host': { '@context': 'https://schema.org', '@graph': [{ '@type': 'https://schema.org.evil.example/Review' }] },
  'undefined prefix': { '@context': 'https://schema.org', '@graph': [{ '@type': 'nope:Review' }] },
  'schema.org IRI is case-sensitive (lowercase review type is not the type)': { '@context': 'https://schema.org', '@graph': [{ '@type': 'review' }] },
  'null context clears inherited schema.org vocabulary': { '@context': 'https://schema.org', '@graph': [{ '@context': null, '@type': 'Review', review: 'x' }] },
  'null context drops inherited prefixes': { '@context': { schema: 'https://schema.org/' }, '@graph': [{ '@context': null, '@type': 'schema:Review' }] },
  'Article + Person': { '@context': 'https://schema.org', '@graph': [...base, { '@type': 'Article', headline: 'h' }, { '@type': 'Person', name: 'n' }] },
};
for (const [name, data] of Object.entries(allowed)) {
  test(`normaliser allows: ${name}`, () => assert.deepEqual(findReviewRatingTerms(data), []));
}

for (const [name, data] of Object.entries(rejected)) {
  test(`foundation QA fails (invariant) for: ${name}`, () => {
    const fx = makeFixture();
    try {
      fx.put('index.html', page({ p: '/', title: 'Home Nitro', head: ld(data), body: '<a href="/">Home</a><a href="/products/">Products</a><a href="/about/">About</a><img src="/wp-content/uploads/2020/01/hero.jpg">' }));
      const f = run(fx, 'foundation');
      assert.ok(codes(f).includes(CODE), codes(f).join(', '));
      assert.equal(f.passed, false);
    } finally { cleanup(fx); }
  });
}

test('foundation QA ignores the check for unrelated JSON-LD (healthy fixture passes, no review finding)', () => {
  const fx = makeFixture();
  try {
    const f = run(fx, 'foundation');
    assert.ok(!codes(f).includes(CODE));
    assert.equal(f.passed, true);
    fx.put('index.html', page({ p: '/', title: 'Home Nitro', head: jsonLd() + ld(allowed['text containing the words review/rating']), body: '<a href="/">Home</a><a href="/products/">Products</a><a href="/about/">About</a><img src="/wp-content/uploads/2020/01/hero.jpg">' }));
    assert.ok(!codes(run(fx, 'foundation')).includes(CODE));
  } finally { cleanup(fx); }
});
