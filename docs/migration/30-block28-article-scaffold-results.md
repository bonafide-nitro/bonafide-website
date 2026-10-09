# Block 28 (Issue #74) — Historical article scaffold markers

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment, commerce, redirect, external-retrieval or Stage 9 change.

## Method
Each of the 15 `qa.config.json -> articleRoutes` pages was inspected against the preserved evidence (docs 07–13, 19/20, 25, `qa/t7-image-manifest.json`). A scaffold marker is removed only if the page is migration-complete from available evidence. Missing meta descriptions or images alone were *not* treated as blockers (they are unevidenced and must not be invented); an unresolved exact-copy, destination, date or T7-binary requirement was.

## Routes cleared
**None (0 of 15).** Title/H1, canonical, indexability and Article + Person schema (Block 23) are valid on all 15, but on every route at least one independent content requirement is unresolved: the body is a paraphrase/rewrite of listed themes rather than preserved exact copy, and/or the live page's dates, video/external destinations or image binaries are not evidenced. Per the Issue's STOP clause the markers were left unchanged rather than certifying completeness by deleting a flag.

## Routes still scaffolded and why
| Route | Exact blocker |
| --- | --- |
| `/a-touch-of-vanilla-to-your-nitro-coffee/` | body copy is a rewrite from the meaning listed in Issue #32, not preserved exact copy; page images unrecovered |
| `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/` | body is a paraphrase (exact copy not preserved); no on-page dates; external reference destinations not evidenced; images unrecovered |
| `/how-ambient-stable-coffee-kegs-help-you-save-more-money/` | live page has a video embed whose exact destination is not evidenced; body copy is a rewrite from Issue #32; images unrecovered |
| `/hot-nitro-coffee/` | body is a paraphrase (exact copy not preserved); on-page author/date semantics not captured; images unrecovered |
| `/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/` | body is a conservative paraphrase of listed themes (exact copy not preserved); images unrecovered |
| `/what-is-nitro-cold-brew-coffee/` | body copy is a rewrite from Issue #32 (exact copy not preserved); images unrecovered (ranking image What-is-nitro-Coffee-Explained-simple-Bona-Fide.jpg is a missing T7 binary) |
| `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/` | depends on T7 binary Bag-In-Box-And-Pouch-Shopify-Glass-Cold-Coffee.jpg at its exact upload path (not supplied) plus alt text |
| `/nitro-coffee-health-benefits/` | body is a conservative paraphrase of broad historical statements (exact copy not preserved); images unrecovered |
| `/is-coffee-healthy/` | body is a conservative paraphrase of listed themes (exact copy not preserved); images unrecovered |
| `/coffee-trends-dominate-2018/` | body is a summary of the historical article (exact copy not preserved); images unrecovered |
| `/coffee-doesnt-produce-cancer-says-leading-american-scientist/` | third-party editorial is summarised, not reproduced; no external citation URL evidenced; images unrecovered |
| `/nitro-coffee-future/` | body copy is a rewrite from Issue #32 (exact copy not preserved); images unrecovered |
| `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` | externally sourced/video material has no evidenced destinations; images unrecovered |
| `/stability-kegs-nitro-coffee/` | historical commercial article summarised as originally positioned (exact copy, pricing and destinations not evidenced); images unrecovered |
| `/coffee-on-tap-is-the-future/` | the known archive dates (published 2017-12-01, updated Oct 11, 2023) are not rendered on-page; the live update/interview destination is not evidenced; images unrecovered |

Omitted as unevidenced (recorded, not invented): meta descriptions, images/alt text, publisher, external reference and video destinations. Article dates are preserved in `src/lib/archive.mjs` and are not unevidenced; where a route's known dates are not rendered on-page, that is a rendering gap, not missing evidence.

## Placeholder count (`T5 placeholder-page`, strict QA)
- Before: 35 (15 article + 20 non-article)
- After: 35 (15 article + 20 non-article)

## Determinism
`qa/qa.config.json -> articleScaffold` declares `cleared` (empty) and `remaining` (15, with blockers). `tests/foundation/block28-article-scaffold.test.mjs` requires cleared + remaining to equal `articleRoutes`, each source marker and built `scaffold-placeholder` to match the declaration, and cleared routes to carry no marker or scaffold comment, so a marker cannot be deleted (or kept) without updating the declaration.

## Remaining independent Stage-8 blockers
All 20 non-article scaffold pages, T7 image binaries (alliance, ranking list, Bag-In-Box), commerce inventories, meta descriptions, legal pages, Stage-7 interaction work, staging verification, forensic/security steps. **Stage 8 remains INCOMPLETE.**
