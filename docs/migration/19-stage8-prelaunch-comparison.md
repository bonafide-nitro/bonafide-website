# Stage 8 — Full pre-launch comparison (Block 15, Issue #48)

Repository-only, read-only validation of the static Astro build at `main` = `63d9ed7` (merge of PR #47 / Block 14)
against the preserved SEO baseline (`src/data/seo-baseline.json`), the redirect register
(`src/data/redirects.yaml`), the commerce/integration configuration and `docs/MIGRATION_QA.md`.
No source, data, config, metadata, redirect or QA change was made in this Block; strict QA was not weakened.

**Scope of this record — current-live comparison NOT performed.** `docs/migration/05-execution-plan.md` Stage 8 requires comparing the
static preview against both the preserved baseline *and* current live behavior. This Block compared the repository build against the
preserved baseline only; no live site was accessed. The current-live comparison therefore remains an **unresolved Stage 8 requirement**
(see §4) and this report must not be treated as the complete Stage 8 record.

**Update (Block 16, Issue #50):** a partial current-live comparison, from read-only observations supplied on 2026-10-05, is recorded in
`docs/migration/20-stage8-current-live-comparison.md`. It found no conflict but leaves robots, sitemap, legal routes and 404 behaviour unresolved, so Stage 8 remains incomplete.

**Update (Block 17, Issue #52):** the robots, sitemap, legal-route and 404 observations were supplied on 2026-10-05 and are recorded in `docs/migration/20-stage8-current-live-comparison.md` §10.
They create no new blocker and leave every blocker in §2 below unchanged. Stage 8 is still not declared complete (see doc 20 §11); sitemap child-membership (whether `/products-2/` is listed live) is still unevidenced (doc 20 item C); the legal-copy item in §4 stays open because the copy itself is not recorded in the repo.

**Stage 8 does not authorize cutover.** No production, WordPress/cPanel, DNS, Search Console, redirect,
credential or provider action was taken.

## 6. Exact results (run on the Block branch, clean `npm ci`)

| Command | Result |
| --- | --- |
| `npm run build` | PASS — Astro reports 41 page(s) built; QA sees 40 built pages (39 protected + `/book-appointment/`) plus `404.html` |
| `npm run check:dist` | PASS — `dist/ clean: no forbidden strings` |
| `npm test` | PASS — 255 tests, 255 pass, 0 fail, 0 skipped |
| `python3 -m unittest discover -s tests/isolation -t .` | PASS — 303 tests, OK |
| `npm run qa:foundation` | PASS — **0 invariant failures**, 45 migration-remaining findings; 39/39 protected URLs built |
| `npm run qa:strict` | FAIL (expected) — 45 blocking findings, all migration-remaining, 0 invariant |

## 1. PASSING — preservation areas ready

- **URL/status preservation.** All 39 protected launch URLs in the baseline (Tier-1: 17, Tier-2: 15, Tier-3: 7)
  are built as `/<path>/index.html` (QA: `protected URLs built: 39/39`). No unmanifested pages, no
  do-not-generate paths, no unexpected protected 404s, real `404.html` file present (content is a placeholder, see §2).
- **Intentional noindex.** `/privacy-policies/` and `/terms-of-service/` (Tier-3, `inSitemap:false`) build as 200,
  self-canonical, `noindex`. `/book-appointment/` (planned page) is likewise 200, self-canonical, `noindex`.
- **Product separation.** `/products/` and `/products-2/` are distinct 200 pages; QA T5 (distinct output, no
  canonical/redirect collapse, `/products-2/` contract immutable) and T8 (zero links to `/products-2/`) report no invariant failure.
- **Canonical / indexability / trailing slash / title uniqueness / H1 / schema invariants.** All T3, T4, T6, T13 invariants
  hold (0 invariant findings), including the declared title-uniqueness exceptions only. "Schema invariants" here means only what T6 enforces
  (`Organization`, `WebSite`, `BreadcrumbList` and manifest-declared types); it does **not** cover `Article` + `Person` on posts (see the §2 blocker).
- **Redirect register.** 58 rules: 32 `defined`, 26 `pending-decision`. All T2 invariants pass: 301-only, unique ids/sources,
  defined⇔destination, no loops, no chains/one-hop violations, no protected URL as a source, protected-200 conflict free,
  AMP booking overrides and canonicalisation rules present, every defined destination known. Pending rules are never emitted
  to any built redirect artifact. (Live 301 execution is host behaviour and not proven here.)
- **Integrations are disabled-safe in the built output (no config present):**
  - Contact form: `<form method="post">` with no `action`, submit disabled; nothing is submitted anywhere.
  - Calendly: `/book-appointment/` renders a non-linking `aria-disabled` label; no Calendly script, embed or link.
  - GTM: zero `googletagmanager`/`GTM-` markup in `dist/`; the only `<script>` tags are the 41 inline `application/ld+json` blocks.
  - No Meta Pixel / Klaviyo markup anywhere in `dist/`.
  - Commerce registry (`src/data/commerce.yaml`, `products.yaml`) preserves only evidenced links; unresolved inventory is metadata only, never rendered.
- **Security carryover.** `quickdelivr`, `coredelivr`, `mpackage` are absent from all of `dist/` (contents and file names; T11 + `check:dist`) and from
  source/scripts (the only occurrences are the forbidden-string list in `src/data/seo-baseline.json`). No `wp-content/plugins|themes`, `wp-includes`
  or `wp-json` reference in rendered/runtime code or `dist` (the only `src` occurrence is the intentional do-not-generate manifest entry `/wp-json/*` in `src/data/seo-baseline.json`); no third-party script host in the build.

## 2. LAUNCH BLOCKERS — must be resolved before cutover

These are the strict-QA findings (45, grouped). None is an invariant regression.

| Group | Count | Detail |
| --- | --- | --- |
| Scaffold placeholder pages (`T5 placeholder-page`) | 35 | 34 of the 39 protected pages plus `/book-appointment/` still carry the scaffold marker (content/images/meta descriptions/titles not finalised). Fully marker-free pages: the Block 9 archives (`/blog/page/2/`, category, author and their `page/2/`). |
| 404 page (`T1 placeholder-404`) | 1 | `/404.html` is still a scaffold placeholder. |
| `robots.txt` absent (`T10 robots-absent`) | 1 | Not generated yet. |
| `sitemap.xml` absent (`T9 sitemap-absent`) | 1 | Not generated yet; must include `/products-2/` and only manifest `inSitemap` URLs. |
| Commerce destination counts (`T5 amazon-links-min`, `T5 store-links-min`) | 3 | `/products/`: 0 of 13 Amazon, 13 of 16 store; `/products-2/`: 12 of 22 store. |
| Commerce exact inventory (`T5 commerce-inventory-missing`) | 3 | `qa/qa.config.json` `commerceInventory` unpopulated for `/products/` amazon + store and `/products-2/` store. |
| Inbound links (`T8 inbound-links-min`) | 1 | `/products/`: 39 linking pages, baseline minimum 40. |

Total = 35 + 1 + 1 + 1 + 3 + 3 + 1 = 45. Also blocker classes not visible to QA (not assessed here):

- **Redirect artifact generation and staging verification.** No `.htaccess`/`_redirects` artifact and no generator exist in the repo, so all 32 `defined`
  redirects are currently non-executable. Generating the artifact from `redirects.yaml` (master plan Step 14) and verifying it on staging (T2 one-hop,
  live 301 behaviour, T12 transport; T2 is deploy-blocking) are launch blockers.
- **Pending-decision redirects (26).** `src/data/redirects.yaml` forbids emitting a `pending-decision` rule until its destination is decided, so even after the artifact
  for the 32 `defined` rules is generated these 26 sources (including the nine `/services/*` plugin redirects the master plan requires reproducing) would fall through to
  404. Resolving, or deliberately disposing of, every pending rule (see §4) is a launch blocker.
- **T7 image gate not yet implemented.** Master-plan T7 (deploy-blocking) requires the ranking-image list to resolve 200 and the 6 alliance images to exist, but
  `docs/MIGRATION_QA.md` (T7 row) records they are not in the manifest, and the checker validates only `/wp-content/uploads/` paths already referenced by rendered output.
  `ProductCard.astro` does not render product `image` fields and `public/` holds none of these binaries, so strict QA can turn green without detecting their absence.
  Populating the manifest/checker coverage and supplying the binaries is a launch blocker.
- **Full QA on the protected preview, then T1–T13 on production-host staging.** Master plan Step 16 requires the complete QA suite to pass against the protected
  preview build (fix, do not waive), and Step 17 requires T1–T13 to be re-run on the locked staging URL on the production host to catch server-level differences.
  All results recorded in this report come from a local build only, and the repo contains no preview deployment configuration. Neither the preview-environment run
  nor the staging run has been performed; local strict QA plus the redirect/T12 checks above do not substitute for them. Both remain launch blockers.
- **T16 visual regression.** Pre-deploy gate per master plan (§13.2, 13.3): all 17 Tier-1 URLs at mobile (390px) and desktop (1440px), no horizontal scroll,
  no missing assets in the console, run against preview and then staging before cutover. Not implemented or run here; it remains a launch blocker.
- **Forensic preservation (Stage 2) precedes the clean copy.** An offline, checksummed forensic snapshot of the compromised installation must exist before any
  investigation or remediation (`docs/migration/05-execution-plan.md` Stage 2; master plan Steps 3–6), because producing a clean copy modifies the compromised installation and
  could otherwise destroy evidence. Not assessed here; it is a predecessor blocker to the item below.
- **Article + Person schema on posts not emitted or gated.** The master plan (rows at lines 224 and 710) requires the existing `Article` + `Person` markup on posts to be regenerated, and earlier
  Block records state it is not emitted. T6 enforces only `Organization`, `WebSite`, `BreadcrumbList` and manifest-declared types, and the manifest declares neither `Article` nor `Person`, so strict QA can
  turn green once scaffold markers are removed from the historical article routes without detecting its absence. Emitting it and adding a manifest/T6 gate is a launch blocker.
- **Full Stage 3 security verification (not only the rollback copy).** `docs/migration/05-execution-plan.md` Stage 3 requires: investigating the injection source; removing malicious code and persistence;
  reviewing unexpected users and access paths; reviewing cron/scheduled tasks and file integrity; rotating credentials and strengthening account protection; confirming the cleaned WordPress site functions
  and that the suspicious scripts no longer render; and understanding, or materially mitigating, the entry route, all with documented verification. The master plan's CLEAN definition
  (`docs/migration/04-wordpress-to-static-migration-master-plan.md` Stage 3 checklist) additionally requires two independent malware scans returning clean, seven consecutive days with no
  re-infection, and a Safe Browsing review having been requested (ideally cleared). A rollback artifact can exist while the compromised access path is still active, and a copy cannot be declared
  CLEAN immediately after remediation, so each item remains an explicit launch blocker and none is assessed here.
- **Clean WordPress rollback copy.** Producing and verifying it is a **Stage 3** (security remediation) requirement and a hard prerequisite to any
  static cutover (`docs/migration/05-execution-plan.md` Stage 3 STOP gate); Stage 9 only records its location and the rollback procedure. Not assessed here.
- **Deferred D1 deployment gates (unverified).** Per `docs/migration/06-stage1-pre-build-blockers-resolved.md` ("What remains for a later Block"): confirmation of the installed PHP
  version and its availability after cutover; sibling rollback location inaccessible from the public web and an off-server second copy; no write access between WordPress and the
  static docroot (and from the deploy key to the rollback copy); a locked staging target on the production hosting account itself; static-build retention/archival (previous five builds
  and outgoing release artifact); and a rehearsed first deployment and rollback. None is verified here and none may be assumed.
- **Deletion-aware production deployment.** Per `docs/migration/06-stage1-pre-build-blockers-resolved.md` (D1 section, lines 699-706), the live WordPress installation's executable, plugin and
  theme files must be retired from `/public_html` so they are no longer publicly reachable, and the static build must then be deployed with clearing/deleting of every destination-only file
  left from the previous build (not an overlay copy) on the initial deploy **and on every later redeploy**. A rehearsed overlay copy can succeed while compromised-era PHP remains publicly
  reachable, so this remains an explicit launch blocker; the rehearsal above must exercise the deletion-aware path. None is performed or verified here.
- **New deploy credential (separate human approval required).** Per `docs/migration/06-stage1-pre-build-blockers-resolved.md` (D1 section) and master-plan §10.4, deployment credentials
  must never be reused or pre-staged from the compromised era. A dedicated new deploy key may be created and authorized only **after** forensic preservation, security remediation and
  credential rotation, and only with its own recorded Žaneta approval. The deploy-key permission checks above apply to that new key. None is created or approved here.

## 3. CONFIGURATION-REMAINING — human/provider-supplied, not safe to invent

- `PUBLIC_CONTACT_FORM_ENDPOINT` — form provider/endpoint not chosen; form is disabled until set.
- `PUBLIC_CALENDLY_URL` — exact Calendly URL not preserved in evidence; booking action disabled until set.
- `PUBLIC_GTM_ID` — no GTM container ID configured; zero markup until set.
- Meta Pixel and Klaviyo — no verified retained configuration; remain explicit integration-remaining (no code added).
- **D3 — Meta Pixel retention (unresolved business decision).** Whether Meta advertising is active and the Pixel should be retained at all is undecided
  (`docs/migration/04-wordpress-to-static-migration-master-plan.md` decision table D3). Obtaining a Pixel ID is not authorization to enable it.
- **D4 — consent handling (unresolved Marketing/Legal decision).** GTM, Meta Pixel and Klaviyo all set cookies; whether a consent banner is required for the
  US-dominant audience is undecided (`docs/migration/04-wordpress-to-static-migration-master-plan.md` consent/analytics note and decision table D4). If required, the
  documented fallback is GTM consent mode, configured once. D4 must be resolved, and consent mode implemented if required, before any of these integrations is enabled.

## 4. EVIDENCE-REMAINING — historical source gaps

- **Current-live comparison (Stage 8 requirement, not performed):** comparison of the static preview against current live behavior on `bonafidenitro.com` (status, redirects, canonicals, sitemap/robots, 404s, script carryover). Requires a separately authorised read-only live check; not done in this Block.
- **Exact commerce inventory:** 13 Amazon destinations on `/products/` (not exposed by the capture); unresolved store hrefs: 1 Retail Organic Nitro
  Vanilla, 1 Decaf Mexico (both pages), 6 Alliance (`/products-2/`); `/howtobuy/` distributor/partner outbound hrefs (13 baseline links). Registered in `commerce.yaml` `unresolved`.
- **Legal copy:** exact body copy, live title and meta description for `/privacy-policies/` and `/terms-of-service/` (marked placeholder, not certified).
- **Archive title gaps (marker-free routes):** the live `<title>` of the category and author archive pages is unevidenced and derived from H1 + brand
  (`docs/migration/13-block9-tier3-archives-results.md`, open evidence gaps); these routes carry no scaffold marker and their manifest entries have no title contract, so strict QA
  will not surface the gap when other markers are removed. Meta descriptions of all five Tier-3 archives are likewise unevidenced.
- **Stage 7 page interactions (absent, no remaining gate once markers are removed):** the Tier-2 batch-5 pages (`docs/migration/12-block8-tier2-batch5-results.md`) still lack the
  made-easy branching flow, the selling-page lead inputs and `SCHEDULE A DEMO` action, the Google Docs CTA destinations, the nitro quiz, and the CZ rental destinations (the last three
  unevidenced). `tests/foundation/block8-pages.test.mjs` currently asserts these pages contain no forms, buttons or external CTA destinations, and strict QA sees only their generic
  scaffold markers, so removing the markers could turn QA green without these behaviours. Each must be implemented or deliberately disposed of, with its own gate, before launch.
- **D6 — EU equipment rental route (unresolved business decision):** `/hot-nitro-equipment-rental/` is currently rendered as a 200 page, but the master plan makes retaining it conditional on
  D6 (whether EU equipment rental is still a live business line). Until D6 is decided, removing its scaffold marker must not be read as launch readiness; the correct treatment may be consolidation
  rather than publishing a possibly stale offering.
- **I2 — indexed marketing-plan PDF (unresolved, deploy-blocking decision):** `/wp-content/uploads/2026/02/Bona-Fide-Marketing-Plan-2026.pdf` is a standalone indexed asset (602 impressions) tied to no
  page marker or QA contract. Master-plan I2 requires a business decision: preserve the exact path, or remove it and request removal in Search Console. Neither is decided or done here.
- **I3 — indexed offices-coffee PDF (unresolved, preserve-or-redirect requirement):** `/wp-content/uploads/2021/09/17x11-Bona-FIde-coffee-for-Offices-version-10-Email_compressed.pdf`
  (569 impressions) has no copy under `public/` and no redirect, and is tied to no page marker or QA contract. Master-plan I3 requires preserving the exact path or redirecting it to
  `/howtobuy/`; until one is done and verified, removing page markers must not be read as launch readiness, as the URL would otherwise become an unexpected 404.
- **Page assets/metadata:** image binaries and alt text, page-level assets, PDFs and meta descriptions for pages that still carry the scaffold marker; `/` customer-testimonial section (I7 Review schema resolved by omission in Block 30, doc 21).
- **Pending-decision redirects (26, unresolved and not fabricated; launch blocker, see §2):** 14 exact legacy paths (`/To`, `/roots/`, `/where-to-refill-your-`, `/blog-new/`,
  `/collections/`, `/sustainability/`, `/copyright-notice/`, `/kegging-service/`, `/best-coffee-creamers/`, `/best-nitro-cold-brew-coffee-maker/`, `/author/raul/`,
  `/cold-brew-coffee-tap-future-serve/`, `/contact-email/`, plus `/coffee-trend-dominate-2018`); 9 external `/services/*` rules with truncated store-URL fragments
  only; 3 raw post-ID URLs (`/?p=1187`, `/?p=1202`, `/?p=1211`).

## 5. NOT BLOCKING REPO BUILD — deferred to pre-cutover configuration

- Production application of the redirect artifact on the host (artifact generation and staging verification are launch blockers, see §2; not performed in this Block).
- Deferred QA classes per `docs/MIGRATION_QA.md`: T12 transport, live HTTP status/one-hop behaviour, MIME types, T14 forms and T15 analytics smoke tests, T17 Lighthouse (advisory; T16 is a launch blocker, see §2), scheduled production crawl.
- Setting the three `PUBLIC_*` variables and any Meta/Klaviyo configuration at build time on the deploy host.
- Stage 9 cutover/rollback planning (explicitly out of scope here); the deferred D1 deployment gates it depends on remain visible in §2.

## 7. Statement

Foundation QA stays at **0 invariants**; strict QA fails on 45 legitimate migration-remaining findings that are enumerated above and not hidden.
**Stage 8 does not authorize cutover.** Cutover requires separate explicit Žaneta approval recorded on GitHub.
