# Block 8 (Issue #34) — Remaining Tier-2 pages: results and remaining gaps

Source: only the public rendered-page evidence supplied in Issue #34 plus repo evidence. No live site, WordPress, cPanel, credential or network access was used. Tier-3 routes (pagination, category/author, legal/utility) are deliberately deferred.

## Migrated (static Astro, exact evidenced title/H1, self-canonical, indexable, Organization + WebSite + WebPage + BreadcrumbList JSON-LD, no scripts/forms/embeds/images)
| URL | Notes |
| --- | --- |
| `/nitro-cold-brew-old/` | Distinct 200 page; not canonicalised/redirected to `/nitro-cold-brew/`. Historical health/safety framing kept conservative. |
| `/nitro-cold-brew-coffee-made-easy-2/` | Informational content as static sections; guided/branching interaction **not** recreated. |
| `/coffee-trends-dominate-2018/` | By John Goerke, 2018-03-22, upd. 2018-11-16; five historical themes, 2018 framing kept. `/blog/` now links it. |
| `/coffee-doesnt-produce-cancer-says-leading-american-scientist/` | By John Goerke, 2018-02-13, upd. 2018-11-16; historical context only, no new/stronger claims, no long third-party quotes, no invented citations. |
| `/interested-in-selling-usa/` | B2B static content/CTA shell; no form. |
| `/interested-in-selling-eu-and-usa/` | B2B static content; Google Docs CTAs kept as text without URLs (not evidenced in repo). |
| `/interested-in-selling-eu-qr-2/` | Mirrors EU/USA themes; no invented destinations. |

## Approved QA exception (ZANETA_DECISION, Issue #34, 2026-10-01)
`/nitro-cold-brew/` and `/nitro-cold-brew-old/` share the byte-identical evidenced title. Both exact titles are preserved and the two paths were added to `preservationRules.titleUniquenessException` in `src/data/seo-baseline.json` (alongside `/products/`, `/products-2/`). No other gate was changed. Note: the QA check tests that every member of a duplicate group is on the list, so the list is not pair-scoped; QA code was left untouched per "do not weaken other gates".

## Scaffold marker — kept on all seven
- Images: no binaries/paths evidenced; no `<img>`.
- Meta descriptions: not evidenced; not emitted.
- Body copy: conservative text from the meanings listed in the Issue; must be reviewed against the live pages.
- Forms/Calendly/interaction (made-easy branching, selling-page lead inputs and `SCHEDULE A DEMO`): Stage 7.
- Google Docs CTA destinations, nitro quiz, CZ rental destinations: unevidenced; documented gap.
- Article schema: not emitted (required fields unevidenced).

## Results
Foundation QA: PASS, 0 invariants; 48 migration-remaining. Strict: FAIL (expected). `npm run build` (32 pages) and `npm run check:dist` OK; `npm test` 200/200; Python isolation 303/303. Live/external effects: none.

## Correction round (Codex review of f638c67)
- `/nitro-cold-brew-old/`: added the evidenced health-query wording (`is nitro coffee bad for you`, `is nitro cold brew bad for you`) as a neutral question, no new claims; enforced via `mustContainText` and a test.
- `/nitro-cold-brew-coffee-made-easy-2/`: added `cold brew on draft`, `nitro draft coffee`, `coffee draft system` (and related draft terms); enforced via `mustContainText` and a test.
- `/coffee-trends-dominate-2018/`: the baseline records **3 external links from 1 domain** but not their destinations. No URLs were invented; this is an **unresolved evidence gap** (needs the live-page link list), recorded in the scaffold comment, which stays until resolved. Not a Stage-complete page.
