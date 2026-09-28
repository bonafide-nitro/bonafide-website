# Migration QA framework (Stage 5)

Repository-only. It inspects a built static `dist/` against the source-of-truth manifests
(`src/data/seo-baseline.json`, `src/data/redirects.yaml`, `src/data/site.yaml`,
`astro.config.mjs`). It has **no URL list of its own**: the protected URLs, per-URL
contracts, do-not-generate paths, forbidden strings and redirect register are read from
the manifests, so it cannot drift from them. It never contacts a live site.

## Commands
| Command | What it does |
| --- | --- |
| `npm ci && npm run build` | build `dist/` |
| `npm run qa` / `npm run qa:foundation` | development mode (see below); exit 0 = pass |
| `npm run qa:strict` | strict migration mode; exit 1 today by design |
| `npm test` | foundation tests + QA negative/fixture tests (`tests/qa/`) |
| `node qa/cli.mjs --mode strict --json qa-report.json` | also write a structured report |
| `python3 -m unittest discover -s tests/isolation -t .` | existing harness tests |

## Two explicit modes
Every finding is one of two kinds:
- **invariant** — a real regression (wrong canonical, redirect chain, `/products-2/` linked,
  forbidden string, …). Blocks in **both** modes.
- **migration-remaining** — expected incompleteness while Stage 6 is unbuilt: a protected
  URL/`sitemap.xml`/`robots.txt` not built yet, a link to a not-yet-built protected URL, or a
  page that still carries the scaffold marker `<meta name="bonafide-qa" content="scaffold-placeholder">`
  (emitted only by `src/layouts/Base.astro`) failing its content contract (noindex, title/H1/text/
  link/price/schema contracts).

**Foundation mode** blocks on invariants only and *prints every migration-remaining finding* plus
`MIGRATION IS NOT COMPLETE: strict mode would FAIL …`. **Strict mode** blocks on *all* findings, so
it fails until every protected URL is a real, contract-satisfying page. There is no skip flag or
third mode (an unknown `--mode` is an error). The marker cannot hide anything in strict mode: pages
carrying it fail strict. The marker also does not excuse invariants — a scaffold page with a wrong
canonical or two H1s still fails foundation mode. As Stage 6 replaces a placeholder with a real page
(and drops the marker), that page's contracts automatically become invariants in foundation mode too.

## Check map (master plan §13.2)
| Suite | Implemented (static/build-time) | Notes |
| --- | --- | --- |
| T1 URL matrix | every `expect: 200` URL built as `/<path>/index.html`; no unmanifested pages; real `404.html`; no do-not-generate paths in `dist/` | status codes themselves are host behaviour (deferred, see below) |
| T2 Redirects | register validity (301 only, unique id/source, defined⇔destination, `pending-decision` has none), loops, chains/one-hop (incl. `*`/`<slug>` patterns), unknown destinations, protected URL never a source, pending entries never present in built redirect artifacts (`.htaccess`, `_redirects`, …), no HTML meta-refresh | executing 301s on a server is later (T2 live/staging) |
| T3 Canonical/indexability | exactly one absolute self-canonical, no cross-canonical, not pointing at a redirect, trailing slash; `noindex` only where declared | |
| T4 On-page | title present, exactly one `<h1>`, `titleMustContain`/`h1MustContain`, duplicate titles (only the declared `/products/`+`/products-2/` exception) | per-URL contracts for pages other than the two product pages are populated in Stage 6 (manifest note) |
| T5 Content | `mustContainText`, `min/maxAmazonLinks`, `minStoreLinks`, `minPriceStrings`; **`/products/` ≠ `/products-2/`** output; no redirect/canonical collapse between them; manifest contract for `/products-2/` cannot be weakened | |
| T6 Schema | all JSON-LD parses; manifest-declared `schema` types present | site-wide Organization/WebSite and BreadcrumbList-on-24-URLs are **not declared in the manifest**, so they are deferred rather than invented; Rich Results validation is external |
| T7 Images | every `/wp-content/uploads/…` path referenced from any text file in `dist/` (relative or absolute URL, `srcset`, CSS) exists at the same path | ranking-image list and the 6 alliance images are not in the manifest yet (Stage 6) |
| T8 Internal links | **zero links to `/products-2/`**; `minInternalLinksIn`; no link to a redirecting, do-not-generate, or nonexistent URL | |
| T9 Sitemap | `/sitemap.xml` is a valid `<urlset>`; contains `/products-2/`; only manifest `inSitemap` URLs; listed URLs exist and are self-canonical | |
| T10 robots.txt | declares the sitemap; disallows nothing protected | |
| T11 Security | `quickdelivr`, `coredelivr`, `mpackage` nowhere in `dist/` (contents or file names); third-party `<script src>` hosts must be in `qa/qa.config.json` `allowedScriptHosts` (empty today) | |
| T13 Trailing slash | canonical/links/redirect destinations end in `/`; no non-directory `.html`; `site.yaml` and `astro.config.mjs` keep `trailingSlash: 'always'`, `format: 'directory'`, `output: 'static'` | slash-less → slash 301 on the server is deferred |

## Intentionally deferred (cannot be proven from a local static artifact)
- **T12 transport** (HTTPS, http→https, www→apex, certificate, HSTS) — staging/live host.
- **HTTP status codes / one-hop behaviour of live redirects, MIME types, `.htaccess` behaviour** — staging on the production host (cutover step 9).
- **T14 forms, T15 analytics** — post-deploy integration/smoke tests (Stage 7+).
- **T16 visual regression, T17 Lighthouse** — need browser/performance tooling and migrated pages; not introduced here.
- Scheduled production crawl — not part of this Block.

## How Stage 6 turns strict mode green
1. Replace each placeholder with the migrated page (drop the scaffold marker, carry titles/H1/canonical over unchanged, keep `/wp-content/uploads/` paths). Its contracts are then enforced as invariants in foundation mode immediately.
2. Populate `titleMustContain`/`h1MustContain`/`mustContainText` etc. in `seo-baseline.json` from the baseline evidence as each page lands (manifest note); the runner picks them up unchanged.
3. Generate `/sitemap.xml` (must include `/products-2/`) and `/robots.txt`.
4. Add real Organization/WebSite/BreadcrumbList JSON-LD and their manifest declarations when decided.
5. Build a real `404` page.
6. Watch `npm run qa:strict` shrink; the `MIGRATION WORK REMAINING` list is the punch list. Stage 6 is done for QA when `qa:strict` exits 0, and the same must hold on the preview and pre-cutover builds.

Pending-decision redirects stay unexecutable until a human decision fills their destination; the QA suite fails the build if one is ever emitted.

## Current results (this Block)
- Foundation mode on the merged scaffold: **PASS** (0 invariant failures; 64 migration-remaining findings: 35 protected URLs unbuilt, `sitemap.xml`/`robots.txt` absent, placeholder pages/404, product-page content/title/schema/link contracts, 8 links to unbuilt launch URLs).
- Strict mode: **FAIL** with the same 64 findings — expected until Stage 6.
