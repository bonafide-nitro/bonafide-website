# Block 4 (Issue #25) — source-capture results and remaining gaps

Source: `07-block4-public-source-capture.md` (sanitized public rendered-page capture supplied by Santiago per ZANETA_DECISION). No live site, WordPress or network access was used by the implementing session (the live host is not reachable from it).

## Observed commerce destinations (rendered page counts, deduplicated, approved hosts)
| Page | Required | Amazon rendered | Store rendered |
| --- | --- | --- | --- |
| `/products/` | 13 Amazon + 16 store | **0** (labels only; hrefs not exposed by the reader, not invented) | **13** distinct hrefs rendered = the 12 capture-enumerated destinations (store root, 1 collection, 10 products) + 1 extra `https://nitrocoffee.store/` (apex root) prose link; the capture's own count is 12 |
| `/products-2/` | 22 store, 0 Amazon | 0 (correct) | **12** (shared products only; Alliance CTAs timed out in the reader, not invented) |

`qa/qa.config.json > commerceInventory` is intentionally still empty: the exact 13 Amazon / 16 store / 22 store sets are unresolved and remain a **pre-launch gate** before strict QA/cutover. Strict QA still reports `T5:amazon-links-min`, `T5:store-links-min`, `T5:commerce-inventory-missing`.
The retail Organic Nitro Vanilla store CTA is unlinked on `/products/` (capture: href not resolved); the wholesale pages use the capture's resolved Vanilla href.

## /howtobuy/ outbound links (migration-remaining)
The baseline records 13 external links / 6 domains for `/howtobuy/` and requires all outbound links to survive. Only 3 anchors are rendered, all to the store root (`nitrocoffee.store`); the distributor and Alliance partner names are plain text because their hrefs are not in the capture and are not invented. This gap is migration-remaining and is covered by the scaffold marker: it must be closed together with the images before the marker is removed.

## Images
Not downloaded (no network). Evidenced same-path URLs are tracked as follows; **no page references any of them**, because QA T7 (invariant) requires every referenced `/wp-content/uploads/` file to exist.
- Recorded in `src/data/products.yaml` (`image`): product images only (retail and Alliance SKUs).
- **Not** in `products.yaml` (page-level assets, doc 07 §2; tracked here only, no data file yet): 2 banners (`/wp-content/uploads/2022/05/Bona-Fide-Banner-Product-Page-1.jpg`, `/wp-content/uploads/2022/10/Bona-Fide-Banner-New-Home-Page-Gold-Three-Kegs.jpg`) and 3 equipment images (`/wp-content/uploads/2019/08/Bona-Fide-Cold-doble-tap-nitro-machine-compressed.png`, `/wp-content/uploads/2019/05/NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed.png`, `/wp-content/uploads/2022/10/Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png`). All five are outstanding preservation work.
- Binaries and alt text (only Hair Raiser's alt, kept in `products.yaml`, was already recorded) must be supplied, then `<img>` rendering added.

## Copy provenance / gaps
- Titles, H1s, product names, nutrition, prices, tasting notes, shelf-life, Alliance details, distributor lists and metrics are transcribed from doc 07. Where doc 07 gives *meaning* rather than verbatim text (homepage sections, several product-page paragraphs, howtobuy prose) the copy is a faithful paraphrase — flag for Santiago's review against the live page.
- The 212-character `/products/` meta description is **not reproduced**: only its first words are in the repo. Not invented; migration-remaining.
- Homepage testimonial body text is not in the capture; the section is omitted.
- Product-page og/twitter tags are not emitted (not part of this Block's evidence set beyond noted values).

## Scaffold marker
- Kept on `/howtobuy/` (Codex P2): title/H1/canonical/schema/copy/legitimate targets are in place, but image preservation and the outbound-link inventory (13 baseline links) are outstanding — see Images and /howtobuy/ outbound links.
- Kept on `/` (Codex P1): the customer-testimonial section and Review/rating schema are not yet preserved, pending decision I7.
- Kept on `/products/` and `/products-2/` until their commerce contracts can truly pass.
- 404 keeps marker + noindex (out of scope).

## Results
Foundation QA: PASS, 0 invariants; 55 migration-remaining (was 73). Strict: FAIL (expected). `npm test` 153/153, Python isolation 303/303, build + `check:dist` OK.
