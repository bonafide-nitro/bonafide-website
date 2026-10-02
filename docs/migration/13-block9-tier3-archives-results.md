# Block 9 (Issue #36) — Tier-3 archives + `/stability-kegs-nitro-coffee/`: results and remaining gaps

Source: only the live archive evidence in the Issue #36 ZANETA_DECISION (2026-10-02) plus repo evidence. No live site, WordPress, cPanel, credential or network access was used.

## Built (static Astro, self-canonical, indexable, Organization + WebSite + WebPage + BreadcrumbList JSON-LD, no scripts/forms/images)
| URL | Content |
| --- | --- |
| `/blog/` | Unchanged 10-card page 1; now renders the shared list + pagination (1, 2). |
| `/blog/page/2/` | Real page 2: the 5 evidenced posts, in order. Title is the evidenced live title, identical to `/blog/` (see below). |
| `/category/news-nitro-coffee-and-nitro-tea/` (+ `page/2/`) | H1 `Category: News Nitro Coffee and Nitro Tea` and the evidenced intro sentence; page 1 = 10 posts, page 2 = 5 posts. |
| `/author/admin/` (+ `page/2/`) | H1 `Author: John Goerke`; same 10 / 5 split. |
| `/stability-kegs-nitro-coffee/` | Approved prerequisite article (By John Goerke, 2017-12-01, upd. 2018-11-16). Conservative historical summary of the evidenced meanings; no price, GP figure or new claim. Keeps the scaffold marker (images, meta description unevidenced). |

Listing data (membership, order, titles, dates) lives in `src/lib/archive.mjs` and is exactly the supplied evidence; page size 10/5, category membership and author membership are not inferred from anything else. Pagination is plain static links (`aria-current` on the active page).

## Changes to existing data (consequences of the decision)
- `src/data/seo-baseline.json`: new Tier-2 entry `/stability-kegs-nitro-coffee/` (200, self, indexable, in sitemap, title/H1 contract). The five Tier-3 entries are unchanged.
- `src/data/redirects.yaml`: removed the `stability-kegs` 301 (to `/how-ambient-stable-coffee-kegs-help-you-save-more-money/`). The decision requires this URL to be a distinct static 200; QA (`protected-url-redirected`) forbids a 301 on a protected 200 URL. Repo data only; no redirect was deployed or changed anywhere live.
- Tests updated for the new state: `foundation.test.mjs` (15 tier-2 entries), `block7-pages.test.mjs` (`/blog/` links only `/blog/page/2/` among archive routes).

## Open evidence gaps (not invented)
- Live `<title>` of the category/author pages and meta descriptions of all five archives are not evidenced: titles are derived from the evidenced H1 + brand, no meta description is emitted.
- `/blog/page/2/`: the live title is byte-identical to `/blog/`. Per ZANETA_DECISION (correction round 1) the exact title is preserved and exactly one pair, `["/blog/","/blog/page/2/"]`, was added to the pair-scoped `titleUniquenessException`. No other QA gate changed.
- Excerpts, thumbnails and categories on cards are not evidenced and not rendered. `/blog/` keeps the scaffold marker; the five archive routes are complete against their Tier-3 contract and carry no scaffold marker. `/stability-kegs-nitro-coffee/` keeps it.
- The `admin` URL slug vs the `John Goerke` display name is preserved as observed.

## Results
Foundation QA: PASS, 0 invariants; **44** migration-remaining (was 48: five Tier-3 routes now built, `/stability-kegs-nitro-coffee/` added as a scaffold page). Strict: FAIL (expected). `npm run build` (38 pages), `npm run check:dist` OK, `npm test` 218/218, Python isolation 303/303. Live/external effects: none.
