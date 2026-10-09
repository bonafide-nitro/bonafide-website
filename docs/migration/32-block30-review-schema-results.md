# Block 30 (Issue #80) — Homepage Review/rating schema (I7/D7) + JSON-LD normalization

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment, external or Stage 9 change. Replaces abandoned Issue #78 / closed-unmerged PR #79 (started fresh from `main` `403eefc`).

## Evidence re-inspected
- `docs/migration/01` and `02`: Search Console reported 1 valid Review snippet on `/`, item name "Bona Fide Nitro Coffee and Tea" (last detected 2026-09-18). They record only *that* it existed — no reviewer, source, provider, review count, rating value or URL.
- `docs/migration/04` (I7 / D7 / SEO-5 / §JSON-LD): reproduce only if it is a legitimate aggregate of third-party reviews; if it is the site rating itself, drop it and document the loss of one rich result.
- `docs/migration/07`/`08`, `src/pages/index.astro`, `qa/qa.config.json`: the homepage testimonial section is not preserved; the two visible quotes are taglines with no attribution or source.

## Decision (preserve-first / no-invention rule)
No legitimate third-party provenance is evidenced anywhere in the repository. **Review/AggregateRating schema is omitted at launch.** No review count, rating, source, reviewer, provider, testimonial or URL was invented. **Expected loss: the domain's one historical Review-snippet rich result** (the loss the master plan anticipates for self-serving/unverifiable markup). It can be reconsidered only if Žaneta supplies evidence of a genuine third-party review source.

## Invariant
`qa/lib/jsonld.mjs` (`findReviewRatingTerms`) expands each term against the node's `@context` to a schema.org IRI before comparing (no substring matching), handling `@graph`, nested values, array `@type`, `@vocab`, prefixes (any prefix name), term aliases, node-scoped contexts, `https://`/`http://` absolute forms and bare terms. Rejected: types `Review`, `AggregateRating`, `Rating`; properties `review`, `reviewRating`, `aggregateRating`. Allowed (tested): other schema.org terms, similarly-named terms (`reviewedBy`, `ReviewAction`, `lastReviewed`), review terms in another vocabulary/`@vocab`, lookalike hosts, undefined prefixes, text content mentioning the words.

`qa/checks.mjs` (T6) reports `review-rating-schema-unsupported` as an **invariant** (blocks foundation and strict) for any built page.

## Tests
- `tests/qa/review-schema.test.mjs`: normaliser accept/reject matrix; foundation QA fails for bare, absolute https/http, prefixed (`schema:`, other prefix names), aliased, scoped and nested forms; unrelated JSON-LD still passes.
- `tests/foundation/block30-review-schema.test.mjs`: no built page carries review/rating JSON-LD; homepage title/H1/canonical preserved.

## Homepage
Title, H1, canonical, navigation and content are unchanged. The visible testimonial section remains a **separate content blocker** (no preserved evidence); `/` keeps its scaffold marker. `qa/qa.config.json -> nonArticleScaffold.remaining["/"]` text updated to say so; I7 no longer a blocker.

## Placeholder count / strict QA
Unchanged: 35 `T5 placeholder-page`; strict QA still reports 58 migration-remaining findings (0 invariants in foundation).

## Remaining Stage-8 blockers
All 35 scaffolded pages, homepage testimonial content, T7 image binaries, commerce inventories, meta descriptions, legal pages, Calendly/form-provider values, Stage-7 interactions, staging verification, forensic/security steps. **Stage 8 remains INCOMPLETE.**
