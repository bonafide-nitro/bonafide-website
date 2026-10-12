# Block 39 — Original product-page image import (Issue #95)

Repository-only. No WordPress, hosting, GoDaddy, DNS, SSL, redirect, live-site, deployment, Search Console or Stage 9 action.

## Source and validation
The owner attached `bona_fide_block38_original_product_page_assets.zip` (30 originals + `ASSET_MANIFEST.json` with SHA-256, size and, per source page, the observed original `alt`/`title`). It was extracted into an isolated scratch directory and nothing in it was executed; the ZIP and its manifest are not committed. Before import: all 30 entries matched their SHA-256 and size, all had the right PNG/JPEG signature, all paths were `/wp-content/uploads/...` with no traversal. 7 files were already in the repo byte-identical (Hair Raiser and the six Alliance images) and were left untouched.

## Imported (12 new binaries, byte-for-byte, exact case-sensitive paths)
Espresso, Ethiopia, Peru, Guatemala, Decaf Mexico, Vanilla, Hibiscus, Mango, Hazelnut, Caramel, and two Passion Fruit uploads: `2022/05/` (used by the original `/products/`) and `2026/07/` (used by the original `/products-2/`). Pinned by path, size and SHA-256 in `tests/foundation/block39-assets.mjs`.

## Rendering
- `ProductCard.astro` now renders an image when the product records an original `alt` (an empty string is a recorded, genuinely observed empty alt) and the binary exists at the exact path.
- Every product now records the observed alt from the manifest. Non-empty alt: Hair Raiser, Espresso, Ethiopia, Vanilla (both records), Hazelnut on `/products-2/`. All others are the genuine empty alt (nothing invented).
- Original per-page differences are kept in `viewOverrides`: Hazelnut has an empty alt on `/products/` but a non-empty one on `/products-2/`; Passion Fruit uses the `2022/05` upload on `/products/` and the `2026/07` upload on `/products-2/`.
- `/products/` (12 cards) and `/products-2/` (18 cards) remain separate pages; prices, hrefs, commerce mappings and scaffold markers are unchanged.

## Deliberately not done
The manifest also records page-level images (header logo, product-page banners, bullets banners, equipment/machine images, Amazon banner, Classic Blend, serving photo). Their *section position* on the original pages is not evidenced in the manifest, so they are **not imported and not placed**; they remain in the owner's archive for a later Block that supplies placement evidence. Scaffold markers are not removed: full page/commerce/content parity is not evidenced.

## QA accounting
Build: 41 pages. `check:dist`, `check:htaccess`, `npm test` (558 pass), `qa:foundation` pass. Strict QA: 40 blocking findings before and after (delta 0); the remaining findings are scaffold placeholders, T5 store-link minimums and `ranking-list-incomplete`.
