# Block 19 (Issue #56) — static robots.txt, sitemap.xml and 404 page

Repository-only. No production, WordPress/cPanel, DNS, Search Console, redirect, credential or deployment action.

## Implemented
- `src/pages/robots.txt.ts` → `dist/robots.txt`: `User-agent: *`, empty `Disallow:` (nothing blocked; master plan SEO-14 / T10) and
  `Sitemap: https://bonafidenitro.com/sitemap.xml`. The live WP-Optimize disallow and `/wp-sitemap.xml` pointer are deliberately not carried over (doc 20 §10.1).
- `src/pages/sitemap.xml.ts` → `dist/sitemap.xml`: a sitemaps.org `<urlset>` generated from `src/data/seo-baseline.json`, listing exactly the
  manifest entries with `inSitemap: true` (37 URLs). `/products/` and `/products-2/` are both listed as separate URLs. `/privacy-policies/`,
  `/terms-of-service/`, `/book-appointment/` and `/404.html` are excluded. No `lastmod`/`changefreq`/`priority` (nothing invented).
- `src/pages/404.astro` → `dist/404.html`: a real, non-scaffold 404 page (H1, explanation, links to home/products/contact), `noindex`, no redirect or refresh.
  Host-level 404 status behaviour remains a deployment concern and is not asserted here.
- `tests/foundation/block19-static-outputs.test.mjs`; `tests/qa/qa.test.mjs` strict-CLI assertion updated (it expected the now-removed `sitemap-absent`).

## Result
Blockers `T10 robots-absent`, `T9 sitemap-absent` and `T1 placeholder-404` are removed: strict findings 45 → 42, all migration-remaining; invariant failures remain 0.
All other doc 19 §2 blockers are unchanged. Stage 8 remains incomplete; this does not authorize Stage 9 or cutover.
