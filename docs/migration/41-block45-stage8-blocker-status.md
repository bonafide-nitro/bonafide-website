# Block 45 — Stage-8 blocker status (Issue #107)

Repository-only. Base `fc4b3f8` (main, after Block 44). No WordPress, hosting, DNS, redirect, Search Console, deployment or Stage 9 action. No QA rule, threshold, schema, commerce or scaffold change.

## Commands run on base
`npm run build` (41 pages), `npm test` (580 pass, 0 fail), `check:dist`, `check:htaccess`, `check:artifact` (84 files, 0 findings), `qa:foundation` (PASS, 0 invariants), `qa:strict` (FAIL, 40 blocking). **The 40-finding baseline is confirmed, not corrected.**

## Actual strict findings (40)
| Rule | Count | Routes |
| --- | --- | --- |
| T5 `placeholder-page` | 35 | 15 article routes + 20 non-article routes (every scaffolded page, incl. `/products/` and `/products-2/`) |
| T5 `commerce-inventory-missing` | 2 | `/products/`, `/products-2/` |
| T5 `store-links-min` | 2 | `/products/` (13 of 16), `/products-2/` (18 of 22) |
| T7 `ranking-list-incomplete` | 1 | site-wide (master plan §9.3 ranking-image list not in evidence) |

## Stale text corrected
`qa/qa.config.json` `nonArticleScaffold.remaining` for `/products/` and `/products-2/` said "image binaries and alt text not preserved". Per Blocks 36/39/40 ([35](35-block35-product-link-mapping.md), [36](36-block37-product-image-results.md), [37](37-block38-image-alt-evidence.md), [38](38-block39-product-image-import.md), [39](39-block40-page-level-media.md)) the meta description, product images with observed alt, and page-level banners are restored (built: 33 `<img>` on `/products/`, 23 on `/products-2/`). Only those two strings were edited. Both scaffold flags and the 16/22 store-inventory blockers remain; "page copy/section parity not verified" is added because Block 40 records original sections absent from the scaffold copy. `tests/foundation/block45-product-blocker-text.test.mjs` prevents the stale wording from returning.

Note on counts: QA's "found 13" on `/products/` is 10 per-product store hrefs + 3 generic store links (two webstore roots, Bag-In-Box collection); Block 35's "12 evidenced" counts original per-card hrefs. The two are different tallies; nothing was changed.

## Which blockers can move next
**Sufficient repo evidence:** none that lowers the strict count. Every one of the 40 findings needs either exact historical content/URLs or a human decision.

**Need external historical files/decisions**
- *Missing exact URL:* the 3 missing `/products/` store hrefs (incl. suspect retail Vanilla, Block 35 flag 1; Decaf Mexico) and 4 missing `/products-2/` store hrefs; Calendly URL; `/howtobuy/` distributor links; CTA/Google Docs destinations.
- *Missing image binary (no evidenced path/binary):* `/about/` facilities 2-8, `/nitro-coffee-kegs/` keg images, `/kegerators/` and `/nitro-cold-brew/` ranking images, T7 ranking list.
- *Missing original alt:* product images with a genuinely observed empty alt are complete (not a blocker); other pages' alt text is unsupplied.
- *Missing copy/meta:* legal pages, blog excerpts, article bodies, remaining meta descriptions.

## Block 46 recommendation
No source-ready coding task would reduce the strict count, and none is invented here. Do not open a blocked Issue for it. If a Block 46 is wanted anyway, the highest-yield repo-only item is documentation: reconcile the 12-vs-13 `/products/` store tally in `commerce.yaml`/`qa.config.json` notes (no behaviour change). Real progress needs Žaneta to supply or decide the external items above.
