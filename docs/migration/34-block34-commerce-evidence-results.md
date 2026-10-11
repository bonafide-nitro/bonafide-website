# Block 34 — Commerce destinations from the owner-supplied snapshot (Issue #86)

Repository-only. No live WordPress/store/hosting action. Source: the `ZANETA_DECISION` on Issue #86 (public outbound links extracted by Santiago from owner-saved HTML: `/products/` SHA256 `49505e05…feddb82`, `/products-2/` SHA256 `18f94c54…9962d`). The URLs are evidence of what the snapshot contains, **not** verified operational destinations or proof of the full historical inventory. No raw HTML was imported.

## Implemented
- **6 Alliance store hrefs on `/products-2/`**, each attributed by the label in the decision (Caveman, Gorongosa, Jittery John's, Thai Treasures, CULT, Thanksgiving). Stored in `src/data/products.yaml`, validated by the existing `storeHref` rule, rendered only in the wholesale view. Hrefs are byte-for-byte as supplied (including the source spellings `compnay`, `thai-treasure`, `girls-run-the-world`). The `products-2-alliance-store` entry is removed from the `unresolved` register.
- **13 `/products/` Amazon URLs recorded as unmapped evidence** in `qa/qa.config.json > commerceInventory.pages['/products/'].amazon`, in snapshot document order. They are **not rendered**.

## Deliberately not implemented
- **No Amazon anchor is rendered or attached to a product.** The snapshot gives 13 anchors in document order, image-only, and only 3 slugs name a product. The current page has 10 per-style CTA labels (5 products x Nitro/Still), so 13 cannot be mapped 1:1 without guessing.
- **`/products/` Vanilla store link** (`…/collections/pet-nitro-coffee-keg/products/jittery-johns-coffee-company-nitro-pet-5-gal-keg`) is not added: the decision flags it as a likely erroneous source link (it is the Jittery John's product).
- **Existing hrefs not changed where the snapshot differs.** `/products-2/` snapshot #6 (Vanilla coffee, main range) and #11 (Vanilla flavored) use `…/collections/nitro-coffee/…` and `…/collections/pet-nitro-coffee-keg/…` paths, and #10 (Hazelnut) uses a `pet-nitro-coffee-keg` collection path; the repo's earlier-evidenced hrefs for these have no collection prefix. Not silently replaced (open question below).
- `commerceInventory` store lists stay empty: the evidenced sets (12 on `/products/`, 18 on `/products-2/`) are below the 16 / 22 historical minimums, and the 4 + 4 shortfall is not invented.

## Strict QA delta (base `ca74fe0` vs this Block)
| Finding | Before | After |
|---|---|---|
| T5 commerce-inventory-missing | 3 | 2 (`/products/` store, `/products-2/` store) |
| T5 commerce-destination-missing | 0 | 1 (`/products/`: 13 recorded Amazon URLs not rendered) |
| T5 amazon-links-min `/products/` | found 0 | found 0 (unchanged) |
| T5 store-links-min `/products-2/` | found 12 / 22 | found 18 / 22 |
| T5 store-links-min `/products/` | 13 / 16 | 13 / 16 (unchanged) |
| **Total blocking** | **42** | **42** |

The blocker count is unchanged: one finding was exchanged for a more precise one. `/products-2/` moved 12 -> 18 of 22. Nothing is marked resolved. Foundation: 0 invariants. Both pages keep the scaffold marker.

## Open questions (minimal context needed)
1. For each of the 13 Amazon anchors on `/products/`: the nearest visible heading/product name (or the surrounding anchor text/`alt`/title), so each URL can be attached to a card without guessing.
2. Confirm which vanilla/hazelnut `/products-2/` URL variants should win where the snapshot differs from earlier evidence.
3. Whether the `/products/` Vanilla store button should keep its suspected-wrong Jittery John's target.
4. The 4 (`/products-2/`) and 3 (`/products/`) store hrefs still missing against the 22 / 16 historical minimums.

## Tests
`tests/foundation/block34-commerce-evidence.test.mjs` (new) and the updated `block14-commerce.test.mjs` (`/products-2/` now pinned at 18). They pin the six attributed hrefs, wholesale-only rendering, the 13 ordered Amazon URLs, no rendered Amazon href, empty store inventories, and the strict-QA delta above.
