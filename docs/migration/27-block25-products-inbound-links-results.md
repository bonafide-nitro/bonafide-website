# Block 25 (Issue #68) — `/products/` inbound-link baseline correction

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment, analytics or live-site change. Scope per `ZANETA_DECISION` on Issue #68.

## Finding
T8 `inbound-links-min` reported `/products/`: 39 linking pages, minimum 40. T8 counts only the built pages QA indexes (39 protected URLs + `/book-appointment/` = 40) and excludes self-links, so the ceiling is 39. All 39 other pages already link to `/products/` (shared header navigation). `404.html` is not counted by T8. A minimum of 40 was therefore structurally unreachable without inventing a route or changing T8 semantics.

## Change (baseline correction, not a QA waiver)
`src/data/seo-baseline.json`: `/products/` `minInternalLinksIn` 40 → 39, in both the URL entry and `preservationRules.products`. Per decision: no new page, `404.html` not counted, no T8 code change, no page content/link change. `/products-2/` (`maxInternalLinksIn: 0`) and canonicals, redirects, indexability, titles, schema and commerce destinations are untouched. The preserved evidence (`docs/migration/04-…`, which records the original 40) is not edited.

## Verification
`npm run build`, `check:dist`, `check:htaccess` OK; `npm test` 349 pass, 0 fail; Python isolation 303 OK; foundation QA PASS (0 invariants, no T8 finding; `/products-2/` zero-inbound check unaffected); strict QA FAILS with 58 blocking findings (was 59 before this Block), all migration-remaining.

## Still open — Stage 8 remains INCOMPLETE
The T8 blocker is resolved. All other blockers in docs 19/20/26 are unchanged (images/PDFs, commerce inventory, placeholder pages, robots/sitemap, 404, redirects, staging, etc.).
