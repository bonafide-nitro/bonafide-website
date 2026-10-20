# Delivery fast track (Issue #145) — reviewable Astro site, blockers, cutover

Repository-only. No WordPress, DNS/cPanel, hosting, redirect, Search Console, tracking, credential or deployment action. No page/content change was made in this PR: the build on `main` (1904b0d) was found to be complete and reviewable; the work here is verification, inventory and an honest blocker list.

## 1. What blocked browser review (finding)
Nothing in the build. On a clean `npm ci` the site builds (41 pages, 2 s) and every route returns 200 from `astro preview` (an unknown path returns 404). The actual obstacle was that the review path was hard to find and the blocker list was scattered over 55 docs. Both are addressed below.

## 2. Preview (no hosting, no accounts)
```
npm ci
npm run build && npm run preview        # http://localhost:4321/
```
or the one-click zip for a Mac (no Node needed): `npm run package:preview` -> `preview-out/bonafide-preview.zip`, or GitHub -> Actions -> "Owner local preview package" -> latest green run -> artifact `bonafide-local-preview-<commit>` (steps: `docs/OWNER_LOCAL_PREVIEW.md`). The launcher serves only on 127.0.0.1.
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
1. **Contact form is inert**: no `PUBLIC_CONTACT_FORM_ENDPOINT`; the form is disabled and points visitors to email/phone. Needs a human-chosen provider and an end-to-end submission test (Block 11).
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
Preconditions: owner reviews preview; blockers A1-A7 closed or explicitly signed off in writing on GitHub; strict QA run reported as-is.
1. Create a **clean** WordPress backup/copy and verify it restores (rollback asset).
2. Stage the `bonafide-preview/site/` contents on a private staging host with `deploy/apache/staging-overlay.htaccess.template`; smoke-test all routes, redirects, `/products/` vs `/products-2/`, store links, contact form submission.
3. Lower DNS TTL ahead of time (owner action).
4. Owner approves the exact cutover action on GitHub; copy `site/` contents + `deploy/apache/production.htaccess` to the webroot (never the launcher/READ-ME/PREVIEW-INFO files).
5. Verify: home 200, top URLs 200, 301s, robots/sitemap, canonical, contact and purchase journeys; submit sitemap in Search Console (owner).
6. Rollback: restore the previous webroot/WordPress copy and DNS/redirect state; keep WordPress untouched until a stability window passes.
