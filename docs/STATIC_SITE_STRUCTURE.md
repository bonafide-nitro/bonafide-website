# Static site structure (Stage 4 foundation)

Astro, static output only. Nothing here is deployed; no hosting, credential, DNS,
redirect, Search Console or WordPress action is part of this foundation.

## Commands
- `npm ci` — install
- `npm run build` — static build to `dist/`
- `npm run check:dist` — fail if `dist/` contains `quickdelivr`, `coredelivr` or `mpackage`
- `npm test` — foundation tests (data contracts; also checks `dist/` if built)

## Layout
| Path | Purpose |
| --- | --- |
| `astro.config.mjs` | `output: 'static'`, `trailingSlash: 'always'`, `build.format: 'directory'`, `site` from `site.yaml` |
| `src/data/site.yaml` | apex HTTPS canonical host, trailing-slash policy; deployment/analytics deliberately `null` |
| `src/data/navigation.yaml` | launch nav (master plan §8.1); `/products-2/` absent by design |
| `src/data/seo-baseline.json` | protected-URL manifest: 17 Tier-1, 14 Tier-2, retained-200 and noindex URLs, product-page contracts, do-not-generate paths, forbidden build strings |
| `src/data/redirects.yaml` | redirect register (data only). `state: defined` = decided by evidence; `pending-decision` = destination intentionally `null` |
| `src/data/products.yaml` | product structure; `views: [retail, wholesale]` assigns SKUs to `/products/` or `/products-2/`. Two SKUs from the master plan only; full dataset is Stage 6 |
| `src/lib/data.mjs` | loads + zod-validates every data file (build fails on violation) |
| `src/lib/products.mjs` | the single view-assignment function |
| `src/layouts`, `src/components`, `src/pages` | placeholders proving the build: `/`, `/products/`, `/products-2/`, `404` (all `noindex`, no migrated content) |
| `public/` | reserved for `wp-content/uploads/` at original paths (Stage 6) |
| `scripts/check-build-output.mjs` | forbidden-string guard for `dist/` |
| `tests/foundation/` | foundation tests (`node --test`) |

## Preservation rules encoded
- `/products/` and `/products-2/` are separate entries in baseline, data views and pages; neither is a redirect source and `/products-2/` is never a redirect destination.
- `/products-2/` is not in navigation and keeps `inSitemap: true`, `maxInternalLinksIn: 0`.
- Redirects: 301 only, single hop (tested).

## Deferred (not decided by this Block)
- Destinations for the 13 legacy paths that land on the homepage via "404 to Start", for the 3 `?p=` URLs, and for 10 of 11 `/services/*` externals (evidence truncated) — left `pending-decision`.
- `/coffee-trend-dominate-2018` slash-less mapping (evidence slug differs from the Tier-2 slug).
- `.htaccess` generation, sitemap/robots generation, per-URL title/H1 contracts, CI workflow for the build — later Blocks (Stages 5–6).
