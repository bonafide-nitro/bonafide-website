# Block 4 (Issue #25) — source-capture results and remaining gaps

Source: `07-block4-public-source-capture.md` (sanitized public rendered-page capture supplied by Santiago per ZANETA_DECISION). No live site, WordPress or network access was used by the implementing session (the live host is not reachable from it).

## Observed commerce destinations (rendered page counts, deduplicated, approved hosts)
| Page | Required | Amazon rendered | Store rendered |
| --- | --- | --- | --- |
| `/products/` | 13 Amazon + 16 store | **0** (labels only; hrefs not exposed by the reader, not invented) | **13** (12 evidenced product/collection hrefs + store root) |
| `/products-2/` | 22 store, 0 Amazon | 0 (correct) | **12** (shared products only; Alliance CTAs timed out in the reader, not invented) |

`qa/qa.config.json > commerceInventory` is intentionally still empty: the exact 13 Amazon / 16 store / 22 store sets are unresolved and remain a **pre-launch gate** before strict QA/cutover. Strict QA still reports `T5:amazon-links-min`, `T5:store-links-min`, `T5:commerce-inventory-missing`.
The retail Organic Nitro Vanilla store CTA is unlinked on `/products/` (capture: href not resolved); the wholesale pages use the capture's resolved Vanilla href.

## Images
Not downloaded (no network). All evidenced same-path URLs (17 retail/equipment/banner + 6 Alliance) are recorded in `src/data/products.yaml` (`image`) but **no page references them**, because QA T7 (invariant) requires every referenced `/wp-content/uploads/` file to exist. Binaries and alt text (only Hair Raiser's alt was already recorded) must be supplied, then `<img>` rendering added. Equipment/banner images (`Bona-Fide-Banner-Product-Page-1.jpg`, `…Gold-Three-Kegs.jpg`, machine images) are listed in doc 07 §2 and are likewise not yet in the repo.

## Copy provenance / gaps
- Titles, H1s, product names, nutrition, prices, tasting notes, shelf-life, Alliance details, distributor lists and metrics are transcribed from doc 07. Where doc 07 gives *meaning* rather than verbatim text (homepage sections, several product-page paragraphs, howtobuy prose) the copy is a faithful paraphrase — flag for Santiago's review against the live page.
- The 212-character `/products/` meta description is **not reproduced**: only its first words are in the repo. Not invented; migration-remaining.
- Homepage testimonial body text is not in the capture; the section is omitted.
- Product-page og/twitter tags are not emitted (not part of this Block's evidence set beyond noted values).

## Scaffold marker
- Dropped on `/` and `/howtobuy/` (title/H1/canonical/schema/copy/legitimate targets in place; **their image preservation is outstanding — see Images**).
- Kept on `/products/` and `/products-2/` until their commerce contracts can truly pass.
- 404 keeps marker + noindex (out of scope).

## Results
Foundation QA: PASS, 0 invariants; 53 migration-remaining (was 73). Strict: FAIL (expected). `npm test` 153/153, Python isolation 303/303, build + `check:dist` OK.
