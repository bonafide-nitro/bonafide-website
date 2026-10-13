# Block 40 — Page-level product artwork with evidenced placement (Issue #97)

Repository-only. No WordPress, hosting, GoDaddy, DNS, SSL, redirect, live-site, deployment, Search Console or Stage 9 action.

## Evidence
The owner supplied `bona_fide_block38_original_product_page_assets.zip` (30 originals + `ASSET_MANIFEST.json`) and the saved WordPress HTML of `/products/` (canonical `https://bonafidenitro.com/products/`) and `/products-2/` (canonical `.../products-2/`). All were analysed in an isolated scratch directory and nothing was executed; none of them is committed. Original DOM order and `alt` values were read from the saved HTML. Placement is therefore evidenced, not inferred from filenames.

## Imported (10 new binaries, byte-for-byte, exact case-sensitive paths)
Each matched the manifest SHA-256 and size and has the correct PNG/JPEG signature; pinned in `tests/foundation/block40-assets.mjs`.

## Placement (original order, exact observed alt)
`/products/` (retail):
1. `Bona-Fide-Banner-Product-Page-1.jpg` — above the h1 (alt `Bona-Fide-Banner-Product-Page`).
2. `...Gold-Three-Kegs.jpg`, `Bona-Fide-Serving-Nitro-Coffee-Cold-Ok-Cutted.jpg` (empty alt), `Classic-Blend-...jpg` (empty alt) — after the intro, before "Our Cold Brew Nitro Coffee In Keg Products". The original sections they headed ("Brewing Craft…", "Buy Nitro Cold Brew Kegs…", "Buy Better Than Cold Brew… Bag In Box") are not in the scaffold copy and were not invented.
3. `Bona-Fide-Cold-doble-tap-nitro-machine-compressed.png` and `NEW-Hot-Tap-...png` — under "Are You Looking For Dispensing Equipment?", before the CTA.
4. `Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png` — after the "Coffee & Tea For Office" paragraph, before "Coffee Shop Supply".
5. `Bona-Fide-Available-On-Amazon.jpg` — inside each of the 13 mapped Amazon links (the original wraps this image in every Amazon link). Link text and hrefs are unchanged.

`/products-2/` (wholesale): banner above the h1; `...Bullets.jpg` before and `...Bullets2.jpg` after the bullet list (both with alt `Banner-Product-Page-Bona-Fide-Product-Page-Bullets`). No Amazon, no other page-level image (none in the original).

Images are responsive (`max-width:100%; height:auto` with intrinsic width/height to avoid layout shift) and lazy-loaded except the banners.

## Deliberately not done
- Header logo `Bona-Fide-logo-White-color-big-tea-for-website-header-1.png`: it is part of the site-wide WordPress header, not product-page content; placing it would change every page. Not imported. Needs its own Block.
- Product-card images, store links (16/22 still not invented), SEO metadata, scaffold markers (all intact), page copy.
- The 2026/07 duplicate Passion Fruit and other manifest entries already handled in Block 39.

## QA accounting
Build 41 pages; `check:dist`, `check:htaccess`, `npm test` (565 pass, 0 fail), `qa:foundation` pass. Strict QA: 40 blocking findings before and after (delta 0): scaffold placeholders, T5 store-link minimums (13/16, 18/22) and `ranking-list-incomplete`. Tests updated: Block 33 (allowed upload set), Block 36 (banner may be a page image, never a meta/link image), Block 39 (product-image count excludes page-level images; the old "page-level not placed" assertion is replaced by `block40-page-media.test.mjs`).
