# Block 7 (Issue #32) — Blog index + first historical article batch: results and remaining gaps

Source: only the public rendered-page evidence supplied in Issue #32 plus repo evidence. No live site, WordPress, cPanel, credential or network access was used. Remaining Tier-2/Tier-3 URLs (including `/blog/page/2/`, category and author archives) are deliberately deferred.

## Migrated (static Astro, exact evidenced title, self-canonical, indexable, Organization + WebSite + WebPage + BreadcrumbList JSON-LD, no scripts/forms/embeds/images)
| URL | Title | H1 | Dates |
| --- | --- | --- | --- |
| `/blog/` | Nitro Coffee & Nitro Tea News \| Bona Fide Brewing Company \| Blog | Nitro Coffee & Nitro Tea News (**derived from the title**; no `h1MustContain`) | card dates only |
| `/a-touch-of-vanilla-to-your-nitro-coffee/` | A Touch of Vanilla to Your Nitro Coffee - Bona Fide Nitro Coffee | A Touch of Vanilla to Your Nitro Coffee | 2020-10-06 |
| `/how-ambient-stable-coffee-kegs-help-you-save-more-money/` | same as H1 | How Ambient Stable Coffee Kegs Help You Save More Money | 2020-08-22, upd. 2020-08-24 |
| `/nitro-coffee-in-time-of-covid-19-pandemic-how-safe-is-it/` | same as H1 | Nitro Coffee in Time of COVID-19 Pandemic How Safe is it | 2020-07-27, upd. 2022-05-18 |
| `/what-is-nitro-cold-brew-coffee/` | What is Nitro cold brew coffee - Bona Fide Nitro Coffee | What is Nitro cold brew coffee | 2020-07-21, upd. 2020-08-03 |
| `/nitro-coffee-health-benefits/` | Nitro Coffee health benefits \| Bona Fide Nitro Coffee Experts | NITRO COFFEE HEALTH BENEFITS | 2018-06-14, upd. 2022-05-18 |
| `/is-coffee-healthy/` | Is Coffee Healthy \| Bona Fide Nitro Coffee \| News & Blog | IS COFFEE HEALTHY | 2018-05-08, upd. 2020-02-05 |
| `/nitro-coffee-future/` | Nitro Coffee is the future \| Bona Fide Nitro Brewing Company | NITRO COFFEE IS THE FUTURE | 2018-01-19, upd. 2018-11-16 |

All articles show "By John Goerke" and the evidenced dates as `<time>`. `src/data/seo-baseline.json` gained `titleMustContain` for all eight and `h1MustContain` for the seven articles. `tests/foundation/block7-pages.test.mjs` covers exact titles/H1s, canonical, schema, no scripts/forms/embeds/img, dates/author, blog links, historical framing and vocabulary.

## Scaffold marker — kept on all eight (nothing falsely certified)
- **Images:** no binaries or exact upload paths supplied; no `<img>`.
- **Meta descriptions:** not in evidence; not emitted.
- **Body copy:** short, conservative text written from the meaning listed in the Issue; the live rendered text was not supplied, so all copy must be reviewed against the live pages.
- **Article schema:** not emitted (image and other required fields unevidenced).

## Per-page gaps
- **`/blog/`:** lists every evidenced first-page card whose route is built (nine linked cards incl. `/3-cups…/`, `/hot-nitro-coffee/`, `/cold-brew-…bag-in-box…/`, plus `/nitro-coffee-future/`, which is not in the supplied first-page list). "Coffee Trends That Will Dominate in 2018" is on the live first page but its route is not built, so it is shown **unlinked**. Excerpts, categories and images are not evidenced. Pagination (`/blog/page/2/`) is migration-remaining.
- **Ambient stable kegs:** the live YouTube embed is omitted (no video destination evidenced).
- **COVID-19, health benefits, is-coffee-healthy:** labelled as historical articles with a not-medical-advice note; no claim added or strengthened.

## Results
Foundation QA: PASS, 0 invariants; 48 migration-remaining (was 49). Strict: FAIL (expected). `npm test` 187/187, Python isolation 303/303, `npm run build` + `npm run check:dist` OK. Live/external effects: none.
