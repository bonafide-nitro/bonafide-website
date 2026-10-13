# Block 40 — Original page-level artwork on `/products/` and `/products-2/` (Issue #97)

Repository-only. No WordPress, hosting, GoDaddy, DNS, SSL, redirect, live-site, deployment, Search Console or Stage 9 action; no external download.

## Source and validation
Owner-supplied (ZANETA_DECISION on Issue #97): `bona_fide_block38_original_product_page_assets.zip` (30 originals + `ASSET_MANIFEST.json`) and the saved WordPress HTML of `/products/` (canonical `https://bonafidenitro.com/products/`) and `/products-2/`. The ZIP was extracted into an isolated scratch directory and nothing in it was executed; neither the ZIP nor the HTML is committed. All 30 entries matched SHA-256, size and PNG/JPEG signature, all paths are `/wp-content/uploads/...` without traversal. The 19 already in the repo were byte-identical and untouched; **11 were imported byte-for-byte** (exact case-sensitive paths; pinned in `tests/foundation/block40-assets.mjs`).

## Evidenced positions (document order of the saved HTML) and rendering
`/products/`
- header logo (linked to `/`, alt `Bona Fide Nitro Coffee`), then the product-page banner (alt `Bona-Fide-Banner-Product-Page`) before the `h1`;
- Gold Three Kegs banner and the serving photo (empty alt) after the intro, before the product list;
- Classic Blend bag-in-box photo (empty alt) immediately before the Bag In Box heading;
- the two dispensing machines (cold double tap, hot tap) between the "Dispensing Equipment" text and the equipment link;
- Keg/BIK set image in the Coffee & Tea For Office block;
- "Available On Amazon" image inside each of the 13 mapped Amazon links (original: image wrapped by the link). Hrefs and the link text are unchanged.

`/products-2/`
- header logo and banner before the `h1`; the two Bullets banners flank the bullet list (original 3-column row: image | bullets | image). Alt text is exactly as observed (the `Bullets2` file carries the `Bullets` alt in the original).
No Amazon image on `/products-2/` (wholesale view stays Amazon-free).

All images are responsive (`max-width: 100%`, intrinsic width/height attributes, lazy loading except the banner). Implementation: `src/lib/page-media.mjs` (single evidenced map), `src/components/PageImage.astro`, an optional `logo` prop on `Base.astro` used by these two pages only.

## Deliberately not done
- The header logo is added only to these two pages (the evidence covers only them); other pages are unchanged. The original header background is not in the evidence: the white logo sits on a dark band chosen for legibility only.
- The original `/products/` also links the Classic Blend image to `Bona_Fide_All_Flavors_Image_BIB_*.jpg` (not in the archive): not imported, link not recreated.
- No `og:image`/SEO metadata change (Block 36 text unchanged); `Bona-Fide-Banner-Product-Page-1.jpg` is not emitted in meta.
- Original heading/copy not re-ordered or added (e.g. "Brewing Craft…" sections, original text order around the h1): out of scope; position is anchored to existing sections.
- Store links (13 mapped Amazon kept; 16/22 store links not invented), scaffold markers and all commerce gates are unchanged; `/products/` and `/products-2/` remain separate 200 pages.

## QA accounting
Build 41 pages; `check:dist`, `check:htaccess`, `npm test` (566 pass), `qa:foundation` pass. Strict QA: 40 blocking findings before and after (delta 0). Test changes: Block 33/39/36 tests updated for the new, evidenced images; new `block40-page-level-artwork.test.mjs` covers mapping, placement, alt and asset integrity.
