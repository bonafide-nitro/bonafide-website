# Block 37 — product image rendering (Issue #92)

- `ProductCard.astro` now renders an optional `<img>` only when the product records original `alt` text **and** the binary exists at the exact case-sensitive `public/` path. Otherwise the card stays text-only.
- Qualifying products: **Hair Raiser® Organic only** (`/wp-content/uploads/2017/10/Hair-Raiser-Nitro-Coffee-for-website.png`, alt `Hair Raiser Nitro Coffee by Bona Fide`, evidenced in master plan §data model and `products.yaml`). It renders on both `/products/` and `/products-2/`.
- The six Alliance binaries are present but no original alt text is evidenced, so those cards stay text-only. No alt text was invented; no other product has a binary.
- Attributes: `loading="lazy" decoding="async"`; original width/height are not evidenced, so none are set.
- Prices, hrefs, retail/wholesale separation and scaffold markers are unchanged.
- Tests: `tests/foundation/block37-product-images.test.mjs` (551 tests pass in total). `build`, `check:dist`, `check:htaccess`, `qa:foundation` pass.
- Strict QA: 40 blocking findings before and after (delta 0). The whole product-image inventory is **not** complete; 18 product images remain unrendered.
