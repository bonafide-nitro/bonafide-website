# Block 10 (Issue #38) — Tier-3 legal pages: results and remaining gaps

Source: repository evidence only. No live site, WordPress, cPanel, credential or network access was used.

## Built (static Astro, self-canonical, `noindex`, not in sitemap, Organization + WebSite + WebPage + BreadcrumbList JSON-LD, no scripts/forms/images)
| URL | Content |
| --- | --- |
| `/privacy-policies/` | H1 `Privacy Policies` + an explicit "Migration placeholder" notice. Scaffold marker kept. |
| `/terms-of-service/` | H1 `Terms of Service` + an explicit "Migration placeholder" notice. Scaffold marker kept. |

Baseline contract (`seo-baseline.json`, unchanged): Tier 3, 200, self-canonical, noindex, `inSitemap: false`.

## Evidence limitation — legal copy NOT preserved
A repository-wide search finds no exact body text, live `<title>`, H1 or meta description for either page; the evidence records only that both are `noindex`, have no canonical and no H1 today (docs 01/02/03/04). Nothing was invented: no clauses, dates, entity names, jurisdiction, contact or consent language. The title is derived from the URL slug + brand, and the H1 is an allowed addition (the live pages have none, master plan §9); both are provisional.

## migration-remaining (explicit)
- Exact legal body copy for both pages — requires final pre-launch source recovery from an approved source. Legal-copy preservation is **not** certified.
- Live `<title>` and meta description of both pages.
- Both pages keep the scaffold marker, so strict QA remains appropriately incomplete.

## Results
Foundation QA: PASS, 0 invariants; 44 migration-remaining (the two legal routes now report as scaffold pages rather than absent). Strict: FAIL (expected). Existing Block 4–9 gates unchanged. New tests: `tests/foundation/block10-pages.test.mjs`. Live/external effects: none.

## Test change to an existing assertion
`tests/qa/qa.test.mjs` (real-dist CLI test) asserted strict mode reports `protected-url-missing`. These two routes were the last unbuilt protected URLs, so that finding can no longer occur; the assertion now checks the still-true strict finding `placeholder`. The fixture-based `protected-url-missing` negative test and all QA gate logic are unchanged.
