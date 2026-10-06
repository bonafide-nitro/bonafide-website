# Static site structure (Stage 4 foundation)

Astro, static output only. Nothing here is deployed; no hosting, credential, DNS,
redirect, Search Console or WordPress action is part of this foundation.

## Commands
- `npm ci` — install
- `npm run build` — static build to `dist/`
- `npm run check:dist` — fail if `dist/` contains `quickdelivr`, `coredelivr` or `mpackage`
- `npm test` — foundation tests (data contracts; also checks `dist/` if built) and QA fixture tests
- `npm run qa` / `npm run qa:strict` — migration QA framework, see `docs/MIGRATION_QA.md`

## Layout
| Path | Purpose |
| --- | --- |
| `astro.config.mjs` | `output: 'static'`, `trailingSlash: 'always'`, `build.format: 'directory'`, `site` from `site.yaml` |
| `src/data/site.yaml` | apex HTTPS canonical host, trailing-slash policy; deployment/analytics deliberately `null` |
| `src/data/navigation.yaml` | launch nav (master plan §8.1); `/products-2/` absent by design |
| `src/data/seo-baseline.json` | protected-URL manifest: 17 Tier-1, 14 Tier-2, retained-200 and noindex URLs, product-page contracts, do-not-generate paths, forbidden build strings |
| `src/data/redirects.yaml` | redirect register (data only). `state: defined` = decided by evidence; `pending-decision` = destination intentionally `null`; `deliberate-404` / `dropped` (Block 21) = decided not to redirect, never emitted |
| `src/data/products.yaml` | product structure; `views: [retail, wholesale]` assigns SKUs to `/products/` or `/products-2/`. Two SKUs from the master plan only; full dataset is Stage 6 |
| `src/lib/data.mjs` | loads + zod-validates every data file (build fails on violation) |
| `src/lib/products.mjs` | the single view-assignment function |
| `src/layouts`, `src/components`, `src/pages` | placeholders proving the build: `/`, `/products/`, `/products-2/`, `404` (all `noindex`, no migrated content) |
| `public/` | reserved for `wp-content/uploads/` at original paths (Stage 6) |
| `scripts/check-build-output.mjs` | forbidden-string guard for `dist/` |
| `tests/foundation/` | foundation tests (`node --test`) |
| `qa/`, `tests/qa/` | Stage 5 migration QA runner (foundation vs strict mode) and its negative tests — `docs/MIGRATION_QA.md` |

## Preservation rules encoded
- `/products/` and `/products-2/` are separate entries in baseline, data views and pages; neither is a redirect source and `/products-2/` is never a redirect destination.
- `/products-2/` is not in navigation and keeps `inSitemap: true`, `maxInternalLinksIn: 0`.
- Redirects: 301 only, single hop (tested).

## Deferred (not decided by this Block)
- (Superseded by Block 21, `docs/migration/23-block21-pending-redirects-results.md`: only the 8 truncated `/services/*` destinations remain `pending-decision`.) Destinations for the 13 legacy paths that land on the homepage via "404 to Start", for the 3 `?p=` URLs, and for 9 of the 10 `/services/*` redirects (destinations truncated in evidence; `/services/hair-raiser-organic/` and `/collections-nitro-coffee/` are fully recorded, giving 11 existing plugin redirects in total) — left `pending-decision`.
- `/coffee-trend-dominate-2018` slash-less mapping (evidence slug differs from the Tier-2 slug).
- `.htaccess` generation, sitemap/robots generation, per-URL title/H1 contracts. (Build/QA CI: `.github/workflows/build-qa.yml`, Stage 5.)
