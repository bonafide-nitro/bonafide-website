# Block 21 (Issue #60) — Pending redirect decisions

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment or live redirect action.
Authority: `ZANETA_DECISION` on Issue #60 (2026-10-06), applied exactly. No destination was invented.

## Register accounting (58 rules; was 32 `defined` + 26 `pending-decision`)
| state | count | emitted to `.htaccess` |
| --- | --- | --- |
| `defined` | 35 (+3) | yes (`# Rules: 35`) |
| `pending-decision` | 8 | no |
| `deliberate-404` (new state) | 12 | no — real 404 on the static host |
| `dropped` (new state) | 3 | no — no rule emitted |

`deliberate-404` and `dropped` are schema states in `src/lib/data.mjs`; the QA register checks (`qa/checks.mjs`, T2) treat every non-`defined` state as
never-executable (no destination, never present in a built redirect artifact).

## Disposition of the 26 prior `pending-decision` entries
| # | id | source | final state | destination | basis |
| --- | --- | --- | --- | --- | --- |
| 1 | `slashless-coffee-trend` | `/coffee-trend-dominate-2018` | `defined` | `/coffee-trends-dominate-2018/` | ZANETA_DECISION item 1; doc 04 §7.5, doc 01 §16c (slash-less → slash version) |
| 2 | `legacy-cold-brew-tap-future` | `/cold-brew-coffee-tap-future-serve/` | `defined` | `/coffee-on-tap-is-the-future/` | ZANETA_DECISION item 2; doc 01 §16c |
| 3 | `legacy-to` | `/To` | `deliberate-404` | — | item 3; doc 04 SEO-12, doc 06 I1 |
| 4 | `legacy-where-to-refill` | `/where-to-refill-your-` | `deliberate-404` | — | item 3 |
| 5 | `legacy-roots` | `/roots/` | `deliberate-404` | — | item 3 |
| 6 | `legacy-blog-new` | `/blog-new/` | `deliberate-404` | — | item 3 |
| 7 | `legacy-collections` | `/collections/` | `deliberate-404` | — | item 3 |
| 8 | `legacy-sustainability` | `/sustainability/` | `deliberate-404` | — | item 3 |
| 9 | `legacy-copyright-notice` | `/copyright-notice/` | `deliberate-404` | — | item 3 |
| 10 | `legacy-kegging-service` | `/kegging-service/` | `deliberate-404` | — | item 3 |
| 11 | `legacy-best-coffee-creamers` | `/best-coffee-creamers/` | `deliberate-404` | — | item 3 |
| 12 | `legacy-best-nitro-maker` | `/best-nitro-cold-brew-coffee-maker/` | `deliberate-404` | — | item 3 |
| 13 | `legacy-author-raul` | `/author/raul/` | `deliberate-404` | — | item 3 |
| 14 | `legacy-contact-email` | `/contact-email/` | `deliberate-404` | — | item 3 |
| 15 | `post-id-1187` | `/?p=1187` | `dropped` | — | item 4; no ID→post mapping in evidence |
| 16 | `post-id-1202` | `/?p=1202` | `dropped` | — | item 4 |
| 17 | `post-id-1211` | `/?p=1211` | `dropped` | — | item 4 |
| 18 | `svc-mango` | `/services/mango-tea/` | `defined` | `https://www.nitrocoffee.store/products/mango-nitro-tea` | item 5; doc 03 §5b (complete, non-truncated fragment) |
| 19 | `svc-peru` | `/services/peru-organic/` | `pending-decision` | — | item 6; truncated fragment |
| 20 | `svc-ethiopia` | `/services/ethiopia-yirgacheffe-organic/` | `pending-decision` | — | item 6 |
| 21 | `svc-guatemala` | `/services/guatemala-organic/` | `pending-decision` | — | item 6 |
| 22 | `svc-hibiscus` | `/services/organic-hibiscus-tea/` | `pending-decision` | — | item 6 |
| 23 | `svc-espresso` | `/services/espresso-organic-nitro-coffee/` | `pending-decision` | — | item 6 |
| 24 | `svc-passion-fruit` | `/services/passion-fruit-tea/` | `pending-decision` | — | item 6 |
| 25 | `svc-green-citrus` | `/services/green-citrus-nitro-tea/` | `pending-decision` | — | item 6 |
| 26 | `svc-cascara` | `/services/cascara-coffee-cherry-tea/` | `pending-decision` | — | item 6 |

Net: 3 → `defined`, 12 → `deliberate-404`, 3 → `dropped`, 8 remain open.

## Caveats (recorded, not decided here)
- `/?p=1187`, `/?p=1202`, `/?p=1211` are query-only sources: Apache cannot return a 404 for them separately from `/`, so on the static host they will serve the homepage content. This is the accepted consequence of the "drop, no rule" decision.
- The 12 `deliberate-404` paths are 404s only once the static build is live; live behaviour today is the compromised "404 to Start" (doc 20 §10). Nothing live was changed.

## Verification
`npm run build`, `npm run check:dist`, `npm run check:htaccess`, `npm test` (269/269), Python isolation (303 OK), foundation QA (PASS, 0 invariants), strict QA (fails as expected on migration-remaining findings only, 0 invariant). `tests/foundation/block20-htaccess.test.mjs` pins 35 emitted rules, the 8/12/3 state counts, the three approved additions, and zero rules/redirects for `deliberate-404`, `dropped` and `pending-decision` sources; no emitted rule targets the bare homepage except the pre-existing `/amp/` rules.

## Still open — Stage 8 remains INCOMPLETE
- 8 truncated `/services/*` `nitrocoffee.store` destinations (`svc-peru`, `svc-ethiopia`, `svc-guatemala`, `svc-hibiscus`, `svc-espresso`, `svc-passion-fruit`, `svc-green-citrus`, `svc-cascara`) still need full URLs from a read-only operator step. No rules emitted.
- Production-host staging verification of the artifact, and all other independent Stage-8 blockers in docs 19/20, are unchanged. This Block does not claim Stage 8 complete and does not authorize deployment, cutover or Stage 9.
