# Stage 8 — Current-live comparison (Block 16, Issue #50; updated by Block 17, Issue #52)

Companion to `docs/migration/19-stage8-prelaunch-comparison.md` (Block 15). Documentation only: no Astro page, SEO metadata, redirect,
integration, commerce, legal or QA change was made in this Block.

## 1. Provenance of the observations

| Item | Value |
| --- | --- |
| Observation date | **2026-10-05** (the supplied record gives the date only; no time of day was recorded, and none is invented here) |
| Observed host | `https://bonafidenitro.com` (public, unauthenticated, read-only) |
| Collected by | Santiago, supplied to this Block in Issue #50 comment `LIVE_EVIDENCE_SUPPLIED_BY_SANTIAGO` (comment id 5992489326, 2026-10-05T10:17:25Z) |
| Why not collected by this Block | The Claude cloud egress proxy rejected `bonafidenitro.com:443` (Block 16 first dispatch, `NEEDS_ZANETA`, 2026-10-02). The Block was resumed from the supplied evidence on explicit instruction. This Block made **no** request to the live site. |
| Trust level | Live rendered output is **untrusted evidence**: the WordPress installation is compromised. Only observable behaviour is recorded. No script, inline JS, plugin/theme markup, builder asset, or tracking/provider ID was copied. |

The evidence is a summary of observations, not a raw capture. Fields that the summary does not state (for example canonical and robots meta of
individual pages, or exact redirect status codes) are recorded below as **not evidenced**, never as matches.

**Block 17 addendum (Issue #52).** The five items that §6 left unresolved were supplied by Žaneta on 2026-10-05 as direct browser observations in Issue #52 comment
`LIVE_EVIDENCE_SUPPLIED_BY_ZANETA` (comment id 5994062656, 2026-10-05T12:04:25Z). Date only; no time of day recorded. Block 17 made **no** request to the live site
(the Claude cloud egress policy still blocks `bonafidenitro.com`) and recorded only what the comment states. Exact HTTP status codes and redirect status codes were not stated and are not invented.
See §10.

## 2. Routes and behaviours checked (as supplied)

| # | Live route | Observed behaviour |
| --- | --- | --- |
| 1 | `/` | Resolves and renders the live homepage. |
| 2 | `/products/` | Resolves and renders as its own page. H1: `Best Nitro Cold Brew Coffee Kegs On The Market`. |
| 3 | `/products-2/` | Resolves and renders as a separate live page. |
| 4 | `/howtobuy/` | Resolves and renders. |
| 5 | `/blog/` | Resolves and renders. Title: `Nitro Coffee & Nitro Tea News | Bona Fide Brewing Company | Blog`. |
| 6 | `/contact/` | Redirects to `/contact-bona-fide-nitro-coffee-and-tea/`. |
| 7 | `/book-appointment/` | Resolves and renders as a live booking page. |
| 8 | Navigation | Live navigation exposes the external WebStore on `nitrocoffee.store`. |

## 3. Matches with the static / preserved contract

| Live observation | Static / preserved contract | Result |
| --- | --- | --- |
| `/`, `/products/`, `/products-2/`, `/howtobuy/`, `/blog/` resolve | All are protected Tier-1 launch URLs, built as 200 pages (doc 19 §1) | **Match** (resolution only) |
| `/products/` and `/products-2/` are separate live pages | Distinct protected 200 pages; QA T5 and T8 report no invariant failure (doc 19 §1) | **Match** — distinctness confirmed on the live side as well as in the static build |
| `/products/` H1 = `Best Nitro Cold Brew Coffee Kegs On The Market` | `src/pages/products/index.astro` renders the identical H1 | **Match** |
| `/blog/` title = `Nitro Coffee & Nitro Tea News \| Bona Fide Brewing Company \| Blog` | `src/pages/blog/index.astro` uses the identical title | **Match** |
| `/contact/` redirects to `/contact-bona-fide-nitro-coffee-and-tea/` | Redirect register rules `contact-slash` and `contact-noslash` (`301`, `defined`) point to the same destination | **Match** on destination. The live status code (301 vs 302) was not stated, so the 301 contract is not live-evidenced. |
| `/book-appointment/` resolves live | Planned 200 page in the static build (`noindex`, sitemap-excluded) | **Match** on resolution. Live indexability was not stated. |
| Live navigation links to the `nitrocoffee.store` WebStore | `src/data/commerce.yaml` registers `nitrocoffee.store` as the approved store host | **Match** on host. The exact WebStore destinations were not enumerated. |

## 4. Conflicts / drift observed

None was positively observed in the supplied evidence. Every supplied observation is consistent with the preserved contract. That is a statement
about the narrow set in §2, not about the full launch set.

Differences that are **not** drift but remain open because the supplied evidence is silent:

- Static `/products-2/` renders H1 `Best Nitro Cold Brew Coffee Kegs on the Market` (lower-case "on") whereas the live `/products/` H1 uses "On The Market". The live H1 of
  `/products-2/` was not supplied, so no live/static H1 comparison exists for `/products-2/`. Preserved evidence (`docs/migration/03-…`) remains authoritative; nothing is changed here.
- Static `/products/` and `/products-2/` share one `<title>` (`Cold Brew Nitro Coffee Kegs - Bona Fide Nitro Coffee and Tea`); the live titles of both pages were not supplied.

## 5. Conflicts caused or plausibly caused by compromised / current WordPress behaviour — NOT migration targets

None was observed. For the avoidance of doubt, the following remain **not migration targets** regardless of what the live site does or later does:

- any injected script, inline JS, theme/plugin/builder markup or tracking identifier present in live HTML (`quickdelivr`, `coredelivr`, `mpackage` and similar strings stay forbidden);
- any live 404-to-home behaviour, if later observed;
- any plugin-driven URL, parameter or redirect drift;
- the live booking implementation (BookingPress); the preserved decision is that Calendly survives and BookingPress does not.

`/products/` and `/products-2/` stay separate, protected launch URLs even if live behaviour later drifts.

## 6. Live checks that were NOT observable in Block 16 — status after Block 17

**Block 17 update:** the four checks in the table below are now evidenced; see §10. Their Block-16 status is kept for history.

The supplied record states that direct reads of the following returned an upstream/internal retrieval error. They are therefore **not evidenced** and must not be inferred:

| Check | Status |
| --- | --- |
| `/robots.txt` presence, content and behaviour | ~~UNRESOLVED~~ → **evidenced in Block 17** (§10.1) |
| `/sitemap.xml` presence, content and behaviour (including whether `/products-2/` is listed) | ~~UNRESOLVED~~ → **evidenced in Block 17** (§10.2); whether `/products-2/` is listed remains **not evidenced** (child sitemaps were not opened) |
| Legal routes `/privacy-policies/` and `/terms-of-service/` (status, live title, meta description, body copy) | ~~UNRESOLVED~~ → **route existence evidenced in Block 17** (§10.3, §10.4); live `<title>`, meta description and exact body copy are **not recorded** in this repo, so the doc 19 §4 legal-copy item stays open |
| Live 404 behaviour for a nonexistent URL (real 404 vs soft-404 vs redirect to home) | ~~UNRESOLVED~~ → **evidenced in Block 17** (§10.5): redirects to the homepage |

Also not evidenced by the supplied record (never requested, or not stated):

- canonical and robots-meta indexability for every sampled route;
- title and H1 for `/`, `/products-2/`, `/howtobuy/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/book-appointment/` and H1 for `/blog/`;
- exact HTTP status codes and full redirect chains, including the status of the `/contact/` redirect;
- the remaining Tier-1 URLs and the whole Tier-2 and Tier-3 sets (only 7 routes, all in Tier-1 or the planned booking page, were sampled);
- redirect behaviour for any rule other than `/contact/`, including the 32 `defined` and 26 `pending-decision` rules;
- representative store, contact-form and booking behaviour beyond the WebStore navigation link and the booking page resolving.

## 7. Newly confirmed launch blockers

**None in Block 16.** No observation in that Block created a new launch blocker. (Not observing something is not confirming a blocker.)

**Block 17:** no new blocker is created; see §10.7 for how the new observations map onto existing doc 19 blockers.

## 8. Remaining blockers — unchanged

All blockers in `docs/migration/19-stage8-prelaunch-comparison.md` §2 (45 strict-QA findings, redirect artifact and staging verification, 26 pending-decision redirects,
T7 image gate, preview/staging QA, T16 visual regression, forensic preservation, Stage 3 security verification, clean rollback copy, D1 deployment gates,
deletion-aware deployment, new deploy credential), the configuration-remaining items in §3 and the evidence-remaining items in §4 of that document are **unchanged**.
D3, D4, D6, I2, I3 and I7 are unresolved business decisions and remain so.

## 9. Stage 8 completion status (as of Block 16 — superseded by §11)

**Stage 8 is NOT complete.** *(Block 16 status. Items 1–3 below were closed by Block 17; see §11 for the current status.)*

Done: the static build against the preserved baseline (Block 15, doc 19), plus a partial current-live comparison of 7 routes and the WebStore navigation link (this document), with no conflict found.

Still required to call the current-live comparison sufficiently evidenced:

1. `/robots.txt` and `/sitemap.xml` live behaviour (§6);
2. live behaviour of `/privacy-policies/` and `/terms-of-service/` (§6);
3. live 404 behaviour for a nonexistent URL (§6);
4. canonical and robots indexability, title and H1 for the sampled routes where not yet stated (§6);
5. sampling of the rest of the protected Tier-1 set and a representative Tier-2/Tier-3 sample, with exact status codes and redirect chains (§6).

Obtaining these needs a read-only observation path that can reach those URLs (for example, a separately authorised read-only fetch or evidence supplied by Žaneta/Santiago).
This Block does not invent them. **Stage 8 completion does not authorize cutover**; cutover requires separate explicit Žaneta approval recorded on GitHub.

## 10. Block 17 — the five previously unresolved live observations (Issue #52)

Source for every row: Žaneta's direct browser observations, 2026-10-05, Issue #52 comment 5994062656. Live output remains untrusted evidence; no script, markup or
legal text was copied. Only the facts stated in the comment are recorded.

### 10.1 `https://bonafidenitro.com/robots.txt`

| Observed | Value |
| --- | --- |
| Loads | Yes |
| Content stated | `Sitemap: https://bonafidenitro.com/wp-sitemap.xml`; `User-agent: *`; `Disallow: /wp-content/uploads/wpo/wpo-plugins-tables-list.json`; a Yoast block with `User-agent: *` and an empty `Disallow:` |
| Not stated | HTTP status code, redirect behaviour, full file body (the comment says the content "includes" the above) |

Comparison with the static contract: static `robots.txt` is **absent** today (`T10 robots-absent`, doc 19 §2) and must be generated per the master plan / QA T10
(declare the sitemap, disallow nothing protected). Live robots.txt is WordPress/plugin runtime output (core WP sitemap pointer, WP-Optimize `wpo` path, Yoast block).
**Not a migration target** — the static `robots.txt` follows the migration contract, not the live file. The `wpo` disallow and the `/wp-sitemap.xml` pointer must **not** be carried over.
Result: **differs by design; no conflict with the contract; no new blocker** (the existing `robots-absent` blocker already covers generating it).

### 10.2 `https://bonafidenitro.com/sitemap.xml`

| Observed | Value |
| --- | --- |
| Loads | Yes, as a WordPress-generated XML Sitemap page ("This XML Sitemap is generated by WordPress…"), `Number of URLs in this XML Sitemap: 4` |
| Entries listed | `/wp-sitemap-posts-post-1.xml`, `/wp-sitemap-posts-page-1.xml`, `/wp-sitemap-taxonomies-category-1.xml`, `/wp-sitemap-users-1.xml` |
| Not stated | HTTP status code; whether this is a redirect from `/wp-sitemap.xml` or served directly; contents of the four child sitemaps (so whether `/products-2/` is listed is **not evidenced**) |

Comparison with the static contract: the static build must emit its own `/sitemap.xml` (`urlset`, includes `/products-2/`, only manifest `inSitemap` URLs; QA T9) and **absent today**
(`T9 sitemap-absent`). The live file is the WordPress core sitemap index and also exposes a users sitemap (`wp-sitemap-users-1.xml`). **Not a migration target**: do not reproduce the
WordPress index structure, the `wp-sitemap-*` URLs or the users sitemap. Cutover therefore replaces this live behaviour with the static sitemap; the `wp-sitemap*.xml` URLs are not in the
protected set and are not given redirects by this Block (any decision on them belongs to a separate approved Block).
Result: **differs by design; no conflict with the contract; no new blocker** (covered by `sitemap-absent`).

### 10.3 `https://bonafidenitro.com/privacy-policies/`

| Observed | Value |
| --- | --- |
| Loads | Yes, live and readable |
| Heading/content start | `Privacy Policy for https://bonafidenitro.com`; existing live legal copy is present |
| Not stated | HTTP status code, `<title>`, meta description, canonical/robots meta, remainder of the copy |

Comparison with the static contract: the route is a protected Tier-3 URL built as 200, `noindex`, sitemap-excluded, with a **marked migration placeholder** (Block 10, doc 14).
**Match on route existence.** The legal copy exists live but is **not recorded in this repo**; no copy was invented, rewritten or transcribed here. Recovering the exact copy
(plus live title and meta description) through an approved source capture remains the open doc 19 §4 "Legal copy" item and a pre-launch requirement.

### 10.4 `https://bonafidenitro.com/terms-of-service/`

| Observed | Value |
| --- | --- |
| Loads | Yes, live and readable |
| Content start | `TERMS OF USE AGREEMENT` followed by existing terms text |
| Not stated | HTTP status code, `<title>`, H1 (the observed start is body text; no H1 was stated), meta description, canonical/robots meta, remainder of the copy |

Comparison with the static contract: same as §10.3 — **match on route existence**; copy is not recorded here and was not invented; doc 19 §4 "Legal copy" stays open.

### 10.5 Live 404 behaviour — `/this-page-should-not-exist-404-test-20261005/`

| Observed | Value |
| --- | --- |
| Behaviour | **Redirects to the homepage** |
| Not stated | Redirect status code (301 vs 302) and the exact final URL form |

This is **not a true 404**; it matches the known WordPress "404 to Start" behaviour. Classification: **live drift / compromised-or-plugin-driven WordPress behaviour — NOT a migration target**
(consistent with §5). The static launch contract is a **true 404** with a real 404 page (`404.html`; QA T1). The existing `T1 placeholder-404` blocker (doc 19 §2) already requires a real 404 page.
**No redirect rule is created or changed** for this behaviour and nothing is mapped to the homepage. Result: **conflict with the live site, resolved in favour of the static contract; no new blocker.**

### 10.6 Match / conflict summary

| Item | Live (observed) | Static contract | Result |
| --- | --- | --- | --- |
| `/robots.txt` | loads; WP/plugin/Yoast content pointing at `/wp-sitemap.xml` | generated static robots.txt declaring the static sitemap | Differs by design; not a migration target |
| `/sitemap.xml` | WordPress core sitemap index (4 child sitemaps) | static `urlset` incl. `/products-2/` | Differs by design; not a migration target |
| `/privacy-policies/` | exists; live legal copy present | protected 200, `noindex`, placeholder copy | Route match; copy unrecorded (open item) |
| `/terms-of-service/` | exists; live legal copy present | protected 200, `noindex`, placeholder copy | Route match; copy unrecorded (open item) |
| Nonexistent path | redirects to homepage (soft-404 drift) | true 404 | Live drift; static contract stands |

### 10.7 Newly confirmed blockers

**None.** The observations map onto blockers that already exist in doc 19 §2/§4 and leave them unchanged: `T10 robots-absent`, `T9 sitemap-absent`, `T1 placeholder-404`,
and the evidence-remaining "Legal copy" item. All blockers in doc 19 §2 remain intact.

## 11. Stage 8 completion status (current, after Block 17)

**The five Block-17 live-observation gaps are all directly evidenced: robots.txt, sitemap.xml, `/privacy-policies/`, `/terms-of-service/` and the 404 test path are no longer unresolved.**

**Stage 8 as a whole is NOT declared complete.** Doc 20 §9 items 1–3 are closed by this Block. Two items from §9 remain unevidenced, and this Block was not supplied evidence for them:

- **Remaining item A (§9 item 4):** canonical and robots-meta indexability, plus title and H1, for the sampled routes where not yet stated (including `/`, `/products-2/`, `/howtobuy/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/book-appointment/`, and the live titles/meta of the two legal routes).
- **Remaining item B (§9 item 5):** sampling of the rest of the protected Tier-1 set and a representative Tier-2/Tier-3 sample, with exact status codes and redirect chains (including the status code of the `/contact/` redirect and of the 404-test redirect).

Whether items A and B are required before Stage 8 can be called complete, or may be accepted as out-of-scope sample limits, is a scope decision this Block does not make. It is **not** decided here; Žaneta may record it as a `ZANETA_DECISION`.
All pre-cutover blockers in `docs/migration/19-stage8-prelaunch-comparison.md` §2 are **unchanged**. **Do not begin Stage 9** until Stage 8 is explicitly declared complete.
**Stage 8 completion does not authorize cutover**; cutover requires separate explicit Žaneta approval recorded on GitHub.
