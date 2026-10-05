# Stage 8 — Current-live comparison (Block 16, Issue #50)

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

## 6. Live checks that were NOT observable — explicitly UNRESOLVED

The supplied record states that direct reads of the following returned an upstream/internal retrieval error. They are therefore **not evidenced** and must not be inferred:

| Check | Status |
| --- | --- |
| `/robots.txt` presence, content and behaviour | **UNRESOLVED** |
| `/sitemap.xml` presence, content and behaviour (including whether `/products-2/` is listed) | **UNRESOLVED** |
| Legal routes `/privacy-policies/` and `/terms-of-service/` (status, live title, meta description, body copy) | **UNRESOLVED** (also keeps the legal-copy item in doc 19 §4 open) |
| Live 404 behaviour for a nonexistent URL (real 404 vs soft-404 vs redirect to home) | **UNRESOLVED** |

Also not evidenced by the supplied record (never requested, or not stated):

- canonical and robots-meta indexability for every sampled route;
- title and H1 for `/`, `/products-2/`, `/howtobuy/`, `/contact-bona-fide-nitro-coffee-and-tea/`, `/book-appointment/` and H1 for `/blog/`;
- exact HTTP status codes and full redirect chains, including the status of the `/contact/` redirect;
- the remaining Tier-1 URLs and the whole Tier-2 and Tier-3 sets (only 7 routes, all in Tier-1 or the planned booking page, were sampled);
- redirect behaviour for any rule other than `/contact/`, including the 32 `defined` and 26 `pending-decision` rules;
- representative store, contact-form and booking behaviour beyond the WebStore navigation link and the booking page resolving.

## 7. Newly confirmed launch blockers

**None.** No observation in this Block creates a new launch blocker. (Not observing something is not confirming a blocker.)

## 8. Remaining blockers — unchanged

All blockers in `docs/migration/19-stage8-prelaunch-comparison.md` §2 (45 strict-QA findings, redirect artifact and staging verification, 26 pending-decision redirects,
T7 image gate, preview/staging QA, T16 visual regression, forensic preservation, Stage 3 security verification, clean rollback copy, D1 deployment gates,
deletion-aware deployment, new deploy credential), the configuration-remaining items in §3 and the evidence-remaining items in §4 of that document are **unchanged**.
D3, D4, D6, I2, I3 and I7 are unresolved business decisions and remain so.

## 9. Stage 8 completion status

**Stage 8 is NOT complete.**

Done: the static build against the preserved baseline (Block 15, doc 19), plus a partial current-live comparison of 7 routes and the WebStore navigation link (this document), with no conflict found.

Still required to call the current-live comparison sufficiently evidenced:

1. `/robots.txt` and `/sitemap.xml` live behaviour (§6);
2. live behaviour of `/privacy-policies/` and `/terms-of-service/` (§6);
3. live 404 behaviour for a nonexistent URL (§6);
4. canonical and robots indexability, title and H1 for the sampled routes where not yet stated (§6);
5. sampling of the rest of the protected Tier-1 set and a representative Tier-2/Tier-3 sample, with exact status codes and redirect chains (§6).

Obtaining these needs a read-only observation path that can reach those URLs (for example, a separately authorised read-only fetch or evidence supplied by Žaneta/Santiago).
This Block does not invent them. **Stage 8 completion does not authorize cutover**; cutover requires separate explicit Žaneta approval recorded on GitHub.
