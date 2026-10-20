# Delivery fast track (Issue #145) — reviewable Astro site, blockers, cutover

Repository-only. No WordPress, DNS/cPanel, hosting, redirect, Search Console, tracking, credential or deployment action. No page/content change was made in this PR: the build on `main` (1904b0d) was found to be complete and reviewable; the work here is verification, inventory and an honest blocker list.

## 1. What blocked browser review (finding)
Nothing in the build. On a clean `npm ci` the site builds (41 pages, 2 s) and every route returns 200 from `astro preview` (an unknown path returns 404). The actual obstacle was that the review path was hard to find and the blocker list was scattered over 55 docs. Both are addressed below.

## 2. Preview (no hosting, no accounts)
```
npm ci
npm run build && npm run preview        # http://localhost:4321/
```
or, **with Node**, build the zip yourself: `npm run build && npm run package:preview` -> `preview-out/bonafide-preview.zip` (needs a prior `dist/`).
**Without Node** (the Mac route): download the GitHub artifact only -- GitHub -> Actions -> "Owner local preview package" -> latest green run -> artifact `bonafide-local-preview-<commit>` -- and follow `docs/OWNER_LOCAL_PREVIEW.md`. The launcher serves only on 127.0.0.1.
A hosted private preview would be a new external service and needs a separate recorded Zaneta approval naming provider, subdomain, access control and noindex handling. None was created.

## 3. Implemented routes (41 HTML + `robots.txt` + `sitemap.xml`, 37 sitemap URLs)
Home `/`; commerce `/products/`, `/products-2/` (separate 200 pages), `/howtobuy/`, `/kegerators/`, `/nitro-coffee-kegs/`, `/hot-nitro-equipment-rental/`; company `/about/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/book-appointment/` (noindex); wholesale `/interested-in-selling-usa/`, `/interested-in-selling-eu-and-usa/`, `/interested-in-selling-eu-qr-2/`; product info `/nitro-cold-brew/`, `/nitro-cold-brew-old/`, `/nitro-cold-brew-coffee-made-easy-2/`, `/hot-nitro-coffee/`, `/stability-kegs-nitro-coffee/`, `/what-is-nitro-cold-brew-coffee/`, `/nitro-coffee-questions/`; blog `/blog/`, `/blog/page/2/`, `/category/news-nitro-coffee-and-nitro-tea/` (+`page/2/`), `/author/admin/` (+`page/2/`) and 15 articles (`/3-cups-of-coffee-a-day-…`, `/a-touch-of-vanilla-…`, `/coffee-doesnt-produce-cancer-…`, `/coffee-on-tap-is-the-future/`, `/coffee-trends-dominate-2018/`, `/cold-brew-coffee-concentrate-bag-in-box-…`, `/healthy-benefits-drinking-nitro-coffee-…`, `/how-ambient-stable-coffee-kegs-…`, `/is-coffee-healthy/`, `/nitro-coffee-future/`, `/nitro-coffee-health-benefits/`, `/nitro-coffee-in-time-of-covid-19-…`); legal `/privacy-policies/`, `/terms-of-service/` (noindex, placeholders); `/404.html`.
Exact article/FAQ/about/howtobuy text comes from the WXR export (PR #144). Home, contact, products, wholesale and blog index were **not** re-ported: they are tied to pinned commerce links and frozen guards (PR #144 trial port broke ~15 of them) and already carry evidenced titles, H1s and links. Preserved as-is.

## 4. Check results (this commit)
| Check | Result |
| --- | --- |
| `npm run build` | OK, 41 pages |
| `npm test` | 744/744 pass |
| `check:dist`, `check:a11y` (41 files), `check:links` (737 refs), `check:artifact` (100 files), `check:htaccess`, `check:apache` | all OK |
| `rehearse:release` | PASS, tree sha256 6349eef1…961ee |
| `qa:foundation` | PASS, 0 invariants |
| `qa:strict` | **FAIL, 41 findings — unchanged, nothing waived**: 34 scaffold-placeholder, 2 commerce-inventory-missing, 2 store-links-min, 2 content-missing, 1 ranking-list-incomplete |

## 5. Blockers
### A. Launch-critical (need owner/source action; real pages were not invented)
1. **Contact form and booking are inert**: no `PUBLIC_CONTACT_FORM_ENDPOINT` (form disabled, points visitors to email/phone) and no `PUBLIC_CALENDLY_URL` (`/book-appointment/` shows "Online scheduling is not available yet"). Needs a human-chosen form provider, an approved Calendly URL, and a real submission and a real booking test (Block 11; `docs/migration/50-block58-contact-booking-release-safety.md`).
2. **Store links**: `/products/` has 13 unique store destinations (target >=16) and `/products-2/` 18 (>=22); the exact inventory is unpopulated. Needs an approved source list; none invented. The 13 distributor links on `/howtobuy/` are not in the export.
3. **34 pages carry the scaffold marker** (incl. home, products, products-2, howtobuy, contact). Each has a recorded reason in `qa/qa.config.json` (missing meta description, byline, or images). Owner signoff per page, or supplied source, is needed to remove the marker; strict QA stays red until then.
4. **Legal pages** (`/privacy-policies/`, `/terms-of-service/`): text exists in the export but contains a personal mailbox and ad-cookie wording; publishing is a legal/business decision. They remain noindex.
5. **Two `content-missing` baseline phrases** ("organic coffee for cancer", "millennials coffee"): decide to require added copy or re-base the phrases on the original text.
6. **Clean WordPress rollback copy** is required before cutover (current install is evidence, not rollback). Security remediation/forensic preservation of the compromised install is a separate owner-gated task.
7. **Host behaviour is untested here**: Apache `.htaccess`/redirects (`deploy/apache/`) are validated offline only; status codes, TLS, and redirects need a staging check on the real host.

### B. Fidelity / optional (do not block a preview)
- Image binaries are absent for many pages (e.g. `/about/` 40, `/howtobuy/` 29, `/hot-nitro-equipment-rental/` 26); external googleusercontent images unrecovered on 4 articles; facilities gallery and brochure PDF not rendered.
- Video embeds shown as plain links (original position not evidenced).
- T7 full ranking-image list not in evidence.
- Home/contact/products/wholesale/blog text could be replaced with exact export text in a later guard-aware pass.

## 6. Proposed cutover / rollback checklist (nothing here is authorised or executed)
Preconditions (all required; none waivable by this checklist, per `docs/migration/40-block43-cutover-readiness-runbook.md` §5): owner reviews preview; `qa:strict` = 0 findings (the 41 above are blocking, not signoff items -- a scaffold marker is cleared only by evidence, never by waiver); blockers A1-A7 closed; security gates G1-G6 of that runbook evidenced (forensic snapshot, compromise/persistence removed, accounts, credential rotation, clean rollback copy, isolated restore test); rollback rehearsal timed on staging; master-plan §14 gates passed; named owners and window set. If any is missing, STOP -- do not request cutover.
1. Create a **clean** WordPress backup/copy and verify it restores (rollback asset). Immediately before the cutover window (same day), take a fresh full backup of the current live WordPress filesystem and database, stored off-server and checksummed (SHA-256 recorded outside the server and re-verified after transfer); no retirement of the live installation (step 4) starts without it (master plan §14 step 1; runbook G1).
2. Stage the `bonafide-preview/site/` contents on a private staging host (separate recorded approval needed). The staging `.htaccess` is the **completed** `deploy/apache/staging-overlay.htaccess.template` (human fills the `@@...@@` values; htpasswd created by a human outside the docroot) plus `production.htaccess`. The preflight has no composed-file mode and each target rejects the other's directives, so check the two inputs separately before composing: `node scripts/build-apache-config.mjs --preflight <completed overlay> --target staging --docroot <actual staging docroot>` and `--preflight deploy/apache/production.htaccess --target production`. Then record the SHA-256 of both inputs and of the composed file as installed, and confirm by observation on staging (auth challenge, `X-Robots-Tag` noindex, 404 page, MIME types, canonical redirects) that the effective configuration is the intended one; passing preflight does not prove this (`docs/migration/51-block59-apache-config.md`). Smoke-test all routes, redirects, `/products/` vs `/products-2/`, store links, contact form and booking.
3. No DNS change: the migration keeps the same domain, host, SSL and `/public_html` docroot (master plan); the routing switch is the webroot replacement only.
4. Owner approves the exact cutover action on GitHub, naming the **exact release commit SHA/tag**. Deploy that release only: build from the tagged SHA, run `npm test`, `qa:foundation`, `check:artifact` on it, and verify the archived `build-manifest.json` against both the staged copy and the production copy (`node scripts/check-release-artifact.mjs --dir <copy> --verify-manifest build-manifest.json` must report 0 missing/extra/changed and the file count must match; master plan §14 step 4; runbook §2.1). A different SHA, an unverified preview artifact or any manifest mismatch is a STOP. Deploy is **deletion-aware**: archive the outgoing build (retain the previous five), retire the live WordPress installation out of `/public_html` to a separate archive location (never into the clean `wp-clean` sibling, which holds the prepared rollback copy and stays untouched), and clear every destination-only file (old PHP, plugins, stale routes) before copying the `site/` contents (`docs/migration/06-stage1-pre-build-blockers-resolved.md`, D1; never the launcher/READ-ME/PREVIEW-INFO files). Install `deploy/apache/production.htaccess` **as the webroot `.htaccess`** (Apache ignores the repository filename) after `--preflight <file> --target production` passes; `dist/` deliberately contains no `.htaccess`, so without this the 404 page, MIME types, canonicalization and all 41 redirects are absent.
5. Verify: home 200, top URLs 200, 301s, robots/sitemap, canonical, contact and purchase journeys; submitting the sitemap in Search Console is a separate consequential action and needs its own recorded owner approval immediately before it is done; cutover approval does not cover it.
6. Rollback (its own recorded approval; rehearsed and timed on staging first): restore the clean WordPress copy from its sibling location, deletion-aware -- first clear the static production files from `/public_html` (delete-then-copy, never overlay-copy, or leftover route-level `index.html` files keep shadowing WordPress), then copy the clean WordPress files in and restore the WordPress `.htaccess`; confirm the database connection, homepage render, Simple 301 Redirects live again and no injected scripts (`docs/migration/06-stage1-pre-build-blockers-resolved.md`, step 4; master plan `:782-788`). No DNS change is involved. Keep the retired live installation and the archived static builds untouched until a stability window passes.
