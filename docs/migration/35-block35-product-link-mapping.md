# Block 35 — Original product button -> Amazon/store URL mapping (Issue #88)

Repository-only. No live WordPress/store/hosting action. Source: the two owner-supplied saved originals attached to the session by the `ZANETA_DECISION` on Issue #88 — `/products/` (canonical `https://bonafidenitro.com/products/`, `page-id-147`) and `/products-2/` (canonical `https://bonafidenitro.com/products-2/`, `page-id-7801`). Both were read as inert text (scripts/styles stripped by a regex parser; nothing executed, nothing fetched). **No raw HTML is committed.**

## Sanitized evidence map — `/products/` Amazon buttons (page 147)
Each Amazon button is an image link (`alt` "Bona Fide Cold brew Nitro Coffee Available On Amazon") inside a product card, directly after a "Nitro Style" or "Still (Flat) Style" label that follows the card's "BUY … NOW!" heading. The same two-anchor pattern repeats per card; every href below appears under exactly one heading.

| # | Card heading (original) | Style label | Exact href |
|---|---|---|---|
| 1 | BUY HAIR RAISER ORGANIC PET KEG NOW! | Nitro | https://www.amazon.com/Bona-Craft-Draft-Nitro-Coffee/dp/B01N1001H9 |
| 2 | (same) | Still (Flat) | https://www.amazon.com/dp/B0BQN58DQR |
| 3 | BUY ORGANIC ESPRESSO PET KEG NOW! | Nitro | https://www.amazon.com/Nitro-Cold-Espresso-Coffee-Organic/dp/B0BQ7JCS18 |
| 4 | (same) | Still (Flat) | https://www.amazon.com/dp/B0BQJNJTVY |
| 5 | BUY YIRGACHEFFE ORGANIC PET KEG NOW! | Nitro | https://www.amazon.com/dp/B073WMK2FL |
| 6 | (same) | Still (Flat) | https://www.amazon.com/dp/B0BQN2SQ2M |
| 7 | BUY ORGANIC PERU PET KEG NOW! | Nitro | https://www.amazon.com/dp/B01NCV8CAE |
| 8 | (same) | Still (Flat) | https://www.amazon.com/dp/B0BQN1P82W |
| 9 | BUY ORGANIC GUATEMALA NOW! | Nitro | https://www.amazon.com/dp/B071J91343 |
| 10 | (same) | Still (Flat) | https://www.amazon.com/dp/B0BQN3876K |
| 11 | BUY ORGANIC HIBISCUS PET KEG NOW! | Nitro (only; no Still label) | https://www.amazon.com/Bona-Fide-Brewing-Company-Hibiscus/dp/B074JJ5CST |
| 12 | BUY ORGANIC NITRO CARAMEL COFFEE PET KEG NOW! | Nitro | https://www.amazon.com/dp/B0BQJNW91V |
| 13 | (same) | Still (Flat) | https://www.amazon.com/dp/B0BQMZKWM1 |

These are the same 13 URLs, in the same order, as Block 34's `qa.config.json` evidence (mapping is now unambiguous). `/products-2/` (page 7801) contains **no** Amazon links. Mango, Passion Fruit, Hazelnut and Vanilla cards have no Amazon button in the original.

## Implemented
- `links.amazon.{nitro,still}` added to the 7 evidenced products in `src/data/products.yaml`; schema (`src/lib/data.mjs`) validates `https://www.amazon.com/…`, no query/fragment.
- `ProductCard.astro` renders each as a "Buy Securely On Amazon.com" link, **retail view only**. The old label-only `amazonCta` flag is removed. Note: Hibiscus and Caramel previously showed no Amazon CTA; the original does, so they now do.
- Removed the `products-amazon` entry from the unresolved register (`commerce.yaml`); updated notes/scaffold comment.

## Store links compared with the original `/products/` page
Retail store hrefs for Hair Raiser, Espresso, Yirgacheffe, Peru, Guatemala, Hibiscus, Mango, Passion Fruit, Hazelnut and Caramel match the repository byte-for-byte. No store link was changed.

## Flagged for a human decision (not changed)
1. **Retail Vanilla store button** in the original points to `…/collections/pet-nitro-coffee-keg/products/jittery-johns-coffee-company-nitro-pet-5-gal-keg` (the Jittery John's product) — suspected wrong. Not rendered on `/products/`, not "corrected".
2. **Vanilla / Hazelnut `/products-2/` variants** (Block 34 open question 2) — unchanged; repository hrefs kept.
3. The original `/products/` store hrefs are 12 distinct, below the historical 16; `/products-2/` stays at 18 of 22. Nothing invented; store inventories remain empty/not complete.

## Strict QA delta (base `1c6e99f` -> this Block)
| Finding | Before | After |
|---|---|---|
| T5 commerce-destination-missing `/products/` (13 Amazon not rendered) | 1 | 0 |
| T5 amazon-links-min `/products/` (found 0) | 1 | 0 |
| **Total blocking** | **42** | **40** |

Foundation: 0 invariants. Remaining `/products/` and `/products-2/` blockers: store inventory not populated, store-links-min, scaffold markers.

## Tests
New `tests/foundation/block35-product-amazon-links.test.mjs` (product->link map, one-to-one with the 13 recorded URLs, style validity, vanilla unchanged, render order, `/products-2/` Amazon-free, 40-blocker accounting). Updated block4/block14/block34 tests that pinned the earlier no-Amazon state.
