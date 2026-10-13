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
| T2 Redirects | the required §13.2 inventory is present (3 protocol/host rules, AMP pattern/root/BookingPress params and the 3 booking AMP overrides, each `defined` rule pinned to its declared destination — `T2:required-redirect-destination`, the 11 legacy plugin rules, slash-normalisation rules; `REQUIRED_REDIRECTS` in `qa/checks.mjs`, matched by source — an empty or pruned register fails); register validity (301 only, unique id/source, defined⇔destination, every non-`defined` state — `pending-decision`, `deliberate-404`, `dropped` — has none), loops, chains/one-hop (incl. `*` patterns, `<slug>` templates expanded for the evidenced slugs in `qa/qa.config.json` `templateSlugs` with exact-source-over-pattern precedence, and full-URL protocol/host canonicalisation rules), unknown destinations, protected URL never a source, pending entries never present in built redirect artifacts (`.htaccess`, `_redirects`, …), no HTML meta-refresh | executing 301s on a server is later (T2 live/staging) |
| T3 Canonical/indexability | exactly one absolute self-canonical, no cross-canonical, not pointing at a redirect, trailing slash; `noindex` only where declared | |
| T4 On-page | title present, exactly one `<h1>`, `titleMustContain`/`h1MustContain`, duplicate titles (only the declared `/products/`+`/products-2/` exception) | per-URL contracts for pages other than the two product pages are populated in Stage 6 (manifest note) |
| T5 Content | `mustContainText`, `min/maxAmazonLinks`, `minStoreLinks` (counted as **deduplicated normalised destination URLs** on approved hosts, never raw anchors) (`/products-2/` has an immutable minimum of 22 store links from the preservation evidence), `minPriceStrings`; **`/products/` ≠ `/products-2/`** output; no redirect/canonical collapse between them; manifest contract for `/products-2/` cannot be weakened | |
| T6 Schema | all JSON-LD parses; manifest-declared `schema` types present; **`Organization` + `WebSite` site-wide and `BreadcrumbList` on every built page are enforced unconditionally** (master plan §13.2, independent of manifest declarations; scaffold pages report them as migration-remaining); **`Article` + `Person` are enforced unconditionally on the 15 historical post routes listed in `qa/qa.config.json` `articleRoutes` (exactly one of each, `Article.author` an `@id` link to the `Person`, `headline`/`datePublished` present, ISO dates) and forbidden on every other page** (Block 23) | Rich Results validation is external |
| T7 Images | every `/wp-content/uploads/…` path referenced from any text file in `dist/` (relative or absolute URL, `srcset`, CSS) exists at the same path | **Block 24:** `qa/t7-image-manifest.json` (6 alliance + 10 evidenced ranking images) is gated: each must exist at its exact path as a real PNG/JPEG (`required-image-missing` is migration-remaining, `required-image-invalid`/`-path-case`/`alliance-count`/`manifest-*` are invariants); the full ranking list is an open evidence gap (`ranking-list-incomplete`, migration-remaining). The binaries are not in the repository, so strict QA fails on them |
| T8 Internal links | **zero links to `/products-2/`**; `minInternalLinksIn`; no link to a redirecting, do-not-generate, or nonexistent URL | |
| T9 Sitemap | `/sitemap.xml` parses as well-formed XML (strict parser, not a regexp) with a sitemaps.org `<urlset>` root and one `<loc>` per `<url>`; contains `/products-2/`; only manifest `inSitemap` URLs; listed URLs exist and are self-canonical | |
| T10 robots.txt | declares the sitemap; disallows nothing protected | |
| T11 Security | `quickdelivr`, `coredelivr`, `mpackage` nowhere in `dist/` (contents or file names); third-party `<script src>` hosts, statically assigned script URLs, static `import`/`export … from` module specifiers and import-map targets must be in `qa/qa.config.json` `allowedScriptHosts` (only `www.googletagmanager.com` today, for the Block 13 GTM loader) | |
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
4. Add real Organization/WebSite/BreadcrumbList JSON-LD to every page (required by strict QA).
5. Build a real `404` page.
6. Watch `npm run qa:strict` shrink; the `MIGRATION WORK REMAINING` list is the punch list. Stage 6 is done for QA when `qa:strict` exits 0, and the same must hold on the preview and pre-cutover builds.

Pending-decision redirects stay unexecutable until a human decision fills their destination; the QA suite fails the build if one is ever emitted.

## Current results (this Block)
- Foundation mode on the merged scaffold: **PASS** (0 invariant failures; 73 migration-remaining findings: 35 protected URLs unbuilt, `sitemap.xml`/`robots.txt` absent, placeholder pages/404, product-page content/title/link contracts, site-wide/breadcrumb schema missing on the 4 scaffold pages, 8 links to unbuilt launch URLs).
- Strict mode: **FAIL** with the same 73 findings — expected until Stage 6.

## T5 exact commerce-destination inventory — Stage 6 requirement

The repository holds only counts and host constraints for commerce links (`/products/`: 13 Amazon + 16 `nitrocoffee.store`; `/products-2/`: 22 `nitrocoffee.store`, 0 Amazon), plus a few truncated examples — **not** the full exact destination sets. The QA runner therefore enforces T5 in two stages (Žaneta decision, PR #24):

1. **Stage 5 (now):** the minimum counts are checked against the *deduplicated, normalised* set of destinations on the approved hosts (`amazon.com`, `amzn.to`, `amzn.com`, `nitrocoffee.store` and subdomains). Repeated copies of one URL, or fragment/trailing-slash/host-case variants, count once.
2. **Exact-destination gate:** `qa/qa.config.json` → `commerceInventory.pages` is the source-of-truth location for the exact URL sets (`/products/` `amazon` + `store`, `/products-2/` `store`). While empty it yields `T5:commerce-inventory-missing` as **migration-remaining**: foundation mode passes while reporting it; **strict mode stays blocked**. Once populated, strict compares the rendered deduplicated set with the inventory (`T5:commerce-destination-missing`) and rejects an inventory smaller than the minimums or on non-approved hosts (`T5:commerce-inventory-invalid`).

**Stage 6 carry-forward:** obtain the exact destination inventory from an approved source (a repo-held export/snapshot, an explicitly authorised read-only source capture, or evidence supplied by Žaneta) and populate `commerceInventory` before the product pages can pass strict QA. Never invent URLs; never access or modify WordPress for this in Block 3.

## Block 4 update (Issue #25)
`/`, `/products/`, `/products-2/`, `/howtobuy/` are built. All four keep the scaffold marker: `/` until the testimonial/Review schema decision (I7) is resolved, `/howtobuy/` until its image binaries and 13 baseline outbound links are preserved, and the two product pages until the exact commerce inventories (13 Amazon / 16 store / 22 store) are resolved **and** their image binaries, alt text, page-level assets, the full 35/25-image inventory and the meta descriptions (both product pages) are preserved. Foundation: 0 invariants, 55 migration-remaining; strict still FAIL. See `docs/migration/08-block4-source-capture-results.md`.

## Block 5 update (Issue #27)
`/kegerators/`, `/nitro-cold-brew/`, `/hot-nitro-coffee/`, `/cold-brew-coffee-concentrate-bag-in-box-versus-cold-brew-in-kegs/`, `/healthy-benefits-drinking-nitro-coffee-nitro-coffee-healthy/` and `/about/` are built and keep the scaffold marker until their image binaries are preserved. Foundation: 0 invariants, 51 migration-remaining; strict still FAIL. See `docs/migration/09-block5-batch2-results.md`.

## Block 6 update (Issue #30)
`/contact-bona-fide-nitro-coffee-and-tea/`, `/coffee-on-tap-is-the-future/`, `/nitro-coffee-kegs/`, `/3-cups-of-coffee-a-day-why-it-can-be-good-for-the-health/`, `/nitro-coffee-questions/` and `/hot-nitro-equipment-rental/` are built and keep the scaffold marker (images, meta descriptions, PDFs, Stage-7 form outstanding). Foundation: 0 invariants, 49 migration-remaining; strict still FAIL. See `docs/migration/10-block6-batch3-results.md`.

## Block 8 update (Issue #34)
`/nitro-cold-brew-old/`, `/nitro-cold-brew-coffee-made-easy-2/`, `/coffee-trends-dominate-2018/`, `/coffee-doesnt-produce-cancer-says-leading-american-scientist/`, `/interested-in-selling-usa/`, `/interested-in-selling-eu-and-usa/` and `/interested-in-selling-eu-qr-2/` are built and keep the scaffold marker (images, meta descriptions, CTA destinations, Stage-7 forms/interaction outstanding). Per ZANETA_DECISION, `/nitro-cold-brew/` + `/nitro-cold-brew-old/` were added as their own pair in the pair-scoped `titleUniquenessException` to preserve their identical launch title. Foundation: 0 invariants, 48 migration-remaining; strict still FAIL. See `docs/migration/12-block8-tier2-batch5-results.md`.

## Block 9 update (Issue #36)
`/blog/page/2/`, `/category/news-nitro-coffee-and-nitro-tea/` (+ `page/2/`) and `/author/admin/` (+ `page/2/`) are built from the exact live archive evidence in the ZANETA_DECISION and carry no scaffold marker; `/stability-kegs-nitro-coffee/` is built as the approved prerequisite article (scaffold: images/meta description outstanding) and its earlier 301 was removed from `src/data/redirects.yaml`. `/blog/page/2/` keeps the evidenced live title, byte-identical to `/blog/`; per ZANETA_DECISION the pair `["/blog/","/blog/page/2/"]` was added to `titleUniquenessException`. Foundation: 0 invariants, 44 migration-remaining; strict still FAIL. See `docs/migration/13-block9-tier3-archives-results.md`.

## Block 10 update (Issue #38)
`/privacy-policies/` and `/terms-of-service/` are built as static 200, self-canonical, `noindex`, sitemap-excluded routes. No exact legal body copy exists in repository evidence, so both carry a marked migration placeholder and the scaffold marker; the legal copy (plus live title/meta description) is an explicit migration-remaining item for pre-launch source recovery and is not certified as preserved. Foundation: 0 invariants, 44 migration-remaining; strict still FAIL. See `docs/migration/14-block10-tier3-legal-results.md`.

## Block 11 update (Issue #40)
The contact page now carries a semantic POST form (name, email, message, honeypot) whose action comes only from the public build-time variable `PUBLIC_CONTACT_FORM_ENDPOINT`; unset/invalid renders it disabled with no action. No provider, endpoint, secret or script is committed. The page keeps the scaffold marker (meta description outstanding). Foundation: 0 invariants, 44 migration-remaining; strict still FAIL. See `docs/migration/15-block11-contact-form-results.md`.

## Block 12 update (Issue #42)
`/book-appointment/` is built as a static 200, self-canonical, `noindex`, sitemap-excluded page (planned-page contract recorded in `seo-baseline.json`). The Calendly destination comes only from the public build-time variable `PUBLIC_CALENDLY_URL`; unset/invalid renders a disabled, non-linking action. No script, embed, tracking or secret was added; the five booking redirects and three AMP overrides are unchanged and tested as one-hop. The page keeps the scaffold marker until the Calendly URL is configured (integration-remaining). Foundation: 0 invariants, 45 migration-remaining; strict still FAIL. See `docs/migration/16-block12-booking-results.md`.

## Block 13 update (Issue #44)
A clean Google Tag Manager layer is wired site-wide through `src/layouts/Base.astro` and driven only by the public build-time variable `PUBLIC_GTM_ID` (valid `GTM-…` IDs only). Unset/invalid emits no GTM script/noscript markup and no third-party script. No ID is committed; no Meta Pixel, Klaviyo, GA4, consent, event or ecommerce code was added (Meta/Klaviyo remain Stage-7 integration-remaining pending verified configuration). No page/SEO/redirect change: foundation QA unchanged. See `docs/migration/17-block13-analytics-results.md`.

## Block 14 update (Issue #46)
External commerce links are centralized in `src/data/commerce.yaml` (+ per-product links in `products.yaml`), validated at build time and resolved through `commerceHref()`. Rendered output is byte-identical to before; no URL was added, repaired or guessed, and the unresolved destinations are recorded as metadata only. `commerceInventory` in `qa/qa.config.json` is unchanged, so strict QA still reports the commerce-inventory gap (migration-remaining). Foundation: 0 invariants. See `docs/migration/18-block14-commerce-links-results.md`.

## Block 15 update (Issue #48) — Stage 8 pre-launch comparison
Read-only comparison of the static build against the baseline, redirect register and integration state; no source, data, QA or metadata change. Results: build, `check:dist`, `npm test` (255/255), Python isolation (303 OK) and foundation QA (0 invariants, 45 migration-remaining) pass; strict QA fails as expected on the same 45 migration-remaining findings, which are grouped (not weakened) in `docs/migration/19-stage8-prelaunch-comparison.md` as launch blockers, configuration-remaining and evidence-remaining. 26 pending-decision redirects remain unresolved. Stage 8 does not authorize cutover.

## Block 16 update (Issue #50) — Stage 8 current-live comparison
Documentation only. Read-only live observations supplied on 2026-10-05 are recorded in `docs/migration/20-stage8-current-live-comparison.md`: 7 routes sampled, no conflict with the preserved contract, `/products/` and `/products-2/` confirmed distinct live. `/robots.txt`, `/sitemap.xml`, the legal routes and live 404 behaviour were not observable and remain unresolved, so Stage 8 is **not** complete. No QA rule, data, page or redirect changed. Stage 8 does not authorize cutover.

## Block 17 update (Issue #52) — Stage 8 live-observation gaps
Documentation only. Žaneta's 2026-10-05 observations are recorded in `docs/migration/20-stage8-current-live-comparison.md` §10: live `/robots.txt` and `/sitemap.xml` are WordPress/plugin output (not migration targets; static T9/T10 contracts unchanged), `/privacy-policies/` and `/terms-of-service/` exist live (copy not recorded here, none invented), and a nonexistent path redirects to the homepage (live drift; static contract remains a true 404). No QA rule, data, page or redirect changed and no new blocker was created. Sitemap child-membership (whether `/products-2/` is listed live) is still unevidenced because the child sitemaps were not opened. Stage 8 is not declared complete (remaining evidence items A/B/C in doc 20 §11). Stage 8 does not authorize cutover.

## Block 18 update (Issue #54) — Stage 8 evidence gaps A/B/C closed by scope decision
Documentation only. No live observation was made (egress to `bonafidenitro.com` is blocked for Claude cloud). Per `ZANETA_DECISION` on Issue #54, gaps A (live metadata), B (additional route sampling) and C (live child-sitemap membership of `/products-2/`) are recorded as accepted out-of-scope sample limits in `docs/migration/20-stage8-current-live-comparison.md` §12; none is treated as a match and no drift is asserted. **Stage 8 remains incomplete** (doc 20 §12.3): the Block resolves only the A/B/C evidence-collection question and does not waive the `05-execution-plan.md` Stage 8 proof gates. Open blockers include the strict-QA migration-remaining findings, robots/sitemap not yet in the static build, the placeholder 404, redirect artifact/staging verification, protected-preview QA and production-host staging QA. No QA rule, data, page, redirect or SEO metadata changed; static `/products/` and `/products-2/` remain separate protected 200 pages; all doc 19 blockers are unchanged. This Block does not authorize cutover or Stage 9.

## Block 20 (Issue #58) — Apache redirect artifact

Repository-only. `scripts/build-htaccess.mjs` generates `deploy/apache/redirects.htaccess` from the 32 `defined` rules (301, one hop; the 26 `pending-decision` rules are never emitted); `tests/foundation/block20-htaccess.test.mjs` verifies it. No QA rule, data, page or redirect register entry changed. Artifact generation is resolved; 26 pending-decision redirects and production-host staging verification remain open, so **Stage 8 remains incomplete**. See `docs/migration/22-block20-htaccess-results.md`. Nothing is deployed.

### Block 21 — pending redirect decisions (Issue #60)

Repository-only. `ZANETA_DECISION` applied to `src/data/redirects.yaml`: 3 → `defined` (35 emitted rules), 12 → new `deliberate-404`, 3 `/?p=` → new `dropped`, 8 truncated `/services/*` remain `pending-decision` (never emitted). `deploy/apache/redirects.htaccess` regenerated; T2 treats every non-`defined` state as never-executable. **8 pending-decision redirects and production-host staging verification remain open, so Stage 8 remains incomplete.** See `docs/migration/23-block21-pending-redirects-results.md`. Nothing is deployed.

### Block 22 — remaining service redirects (Issue #62)

Repository-only. `ZANETA_DECISION` applied to `src/data/redirects.yaml`: 6 `/services/*` → `defined` with operator-verified exact nitrocoffee.store product URLs (41 emitted rules), `svc-green-citrus` and `svc-cascara` → `deliberate-404` (14 total); 0 `pending-decision` remain. `deploy/apache/redirects.htaccess` regenerated. **Production-host staging verification and the other Stage-8 blockers remain open, so Stage 8 remains incomplete.** See `docs/migration/24-block22-service-redirects-results.md`. Nothing is deployed.

### Block 23 — Article + Person schema gate (Issue #64)

Repository-only. `src/lib/article-schema.mjs` emits `Article` + `Person` on the 15 archive posts (fields from `src/lib/archive.mjs` evidence only); T6 gains the unconditional post-route contract above. Image, publisher and description are unevidenced and omitted. Stage 8 remains incomplete. See `docs/migration/25-block23-article-person-schema-results.md`.

## Block 30 update (Issue #80) — decision I7/D7
Homepage Review/AggregateRating schema is resolved as **omitted**; QA T6 now rejects unsupported review/rating JSON-LD on every page (`review-rating-schema-unsupported`, invariant). See `docs/migration/32-block30-review-schema-results.md`. `/` keeps its scaffold marker for the separate, unresolved testimonial-content blocker. Stage 8 remains incomplete.

## Block 34 (Issue #86) — commerce evidence from the owner snapshot

Adds the 6 labelled Alliance store hrefs to `/products-2/` (12 -> 18 of 22) and records the 13 `/products/` Amazon URLs as unmapped evidence in `commerceInventory` (not rendered; per-product association unproven). Strict QA is still 42 blocking findings: `commerce-inventory-missing` 3 -> 2, plus one `commerce-destination-missing`. No blocker is marked resolved; the suspect `/products/` Vanilla link and differing vanilla/hazelnut variants are left unchanged. See `docs/migration/34-block34-commerce-evidence-results.md`.

## Block 43 (Issue #103) — release-artifact preflight and cutover-readiness runbook

Repository-only. Adds `npm run check:artifact` (`scripts/check-release-artifact.mjs`, wired into `test:build`): a read-only scan of `dist/` for non-static file types, WordPress runtime paths, obfuscation primitives and the recorded compromise markers, plus `--write-manifest` / `--verify-manifest` SHA-256 file-set integrity. QA rules are unchanged; strict QA is still 40 blocking findings. The pre-cutover procedure, external security gates and approvals are in `docs/migration/40-block43-cutover-readiness-runbook.md`. No security or clean-rollback gate is claimed complete.
