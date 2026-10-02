# Stage 8 — Full pre-launch comparison (Block 15, Issue #48)

Repository-only, read-only validation of the static Astro build at `main` = `63d9ed7` (merge of PR #47 / Block 14)
against the preserved SEO baseline (`src/data/seo-baseline.json`), the redirect register
(`src/data/redirects.yaml`), the commerce/integration configuration and `docs/MIGRATION_QA.md`.
No source, data, config, metadata, redirect or QA change was made in this Block; strict QA was not weakened.

**Scope of this record — current-live comparison NOT performed.** `docs/migration/05-execution-plan.md` Stage 8 requires comparing the
static preview against both the preserved baseline *and* current live behavior. This Block compared the repository build against the
preserved baseline only; no live site was accessed. The current-live comparison therefore remains an **unresolved Stage 8 requirement**
(see §4) and this report must not be treated as the complete Stage 8 record.

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
  hold (0 invariant findings), including the declared title-uniqueness exceptions only.
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
- **Clean WordPress rollback copy.** Producing and verifying it is a **Stage 3** (security remediation) requirement and a hard prerequisite to any
  static cutover (`docs/migration/05-execution-plan.md` Stage 3 STOP gate); Stage 9 only records its location and the rollback procedure. Not assessed here.

## 3. CONFIGURATION-REMAINING — human/provider-supplied, not safe to invent

- `PUBLIC_CONTACT_FORM_ENDPOINT` — form provider/endpoint not chosen; form is disabled until set.
- `PUBLIC_CALENDLY_URL` — exact Calendly URL not preserved in evidence; booking action disabled until set.
- `PUBLIC_GTM_ID` — no GTM container ID configured; zero markup until set.
- Meta Pixel and Klaviyo — no verified retained configuration; remain explicit integration-remaining (no code added).
- **D4 — consent handling (unresolved Marketing/Legal decision).** GTM, Meta Pixel and Klaviyo all set cookies; whether a consent banner is required for the
  US-dominant audience is undecided (`docs/migration/04-wordpress-to-static-migration-master-plan.md` consent/analytics note and decision table D4). If required, the
  documented fallback is GTM consent mode, configured once. D4 must be resolved, and consent mode implemented if required, before any of these integrations is enabled.

## 4. EVIDENCE-REMAINING — historical source gaps

- **Current-live comparison (Stage 8 requirement, not performed):** comparison of the static preview against current live behavior on `bonafidenitro.com` (status, redirects, canonicals, sitemap/robots, 404s, script carryover). Requires a separately authorised read-only live check; not done in this Block.
- **Exact commerce inventory:** 13 Amazon destinations on `/products/` (not exposed by the capture); unresolved store hrefs: 1 Retail Organic Nitro
  Vanilla, 1 Decaf Mexico (both pages), 6 Alliance (`/products-2/`); `/howtobuy/` distributor/partner outbound hrefs (13 baseline links). Registered in `commerce.yaml` `unresolved`.
- **Legal copy:** exact body copy, live title and meta description for `/privacy-policies/` and `/terms-of-service/` (marked placeholder, not certified).
- **Page assets/metadata:** image binaries and alt text, page-level assets, PDFs and meta descriptions for pages that still carry the scaffold marker; `/` testimonial/Review schema decision (I7).
- **Pending-decision redirects (26, unresolved and not fabricated):** 14 exact legacy paths (`/To`, `/roots/`, `/where-to-refill-your-`, `/blog-new/`,
  `/collections/`, `/sustainability/`, `/copyright-notice/`, `/kegging-service/`, `/best-coffee-creamers/`, `/best-nitro-cold-brew-coffee-maker/`, `/author/raul/`,
  `/cold-brew-coffee-tap-future-serve/`, `/contact-email/`, plus `/coffee-trend-dominate-2018`); 9 external `/services/*` rules with truncated store-URL fragments
  only; 3 raw post-ID URLs (`/?p=1187`, `/?p=1202`, `/?p=1211`).

## 5. NOT BLOCKING REPO BUILD — deferred to pre-cutover configuration

- Production application of the redirect artifact on the host (artifact generation and staging verification are launch blockers, see §2; not performed in this Block).
- Deferred QA classes per `docs/MIGRATION_QA.md`: T12 transport, live HTTP status/one-hop behaviour, MIME types, T14 forms and T15 analytics smoke tests, T16 visual regression, T17 Lighthouse, scheduled production crawl.
- Setting the three `PUBLIC_*` variables and any Meta/Klaviyo configuration at build time on the deploy host.
- Stage 9 cutover/rollback planning (explicitly out of scope here).

## 7. Statement

Foundation QA stays at **0 invariants**; strict QA fails on 45 legitimate migration-remaining findings that are enumerated above and not hidden.
**Stage 8 does not authorize cutover.** Cutover requires separate explicit Žaneta approval recorded on GitHub.
