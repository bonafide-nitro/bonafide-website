# Block 24 (Issue #66) — T7 image gate and required asset manifest

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment or live-site change. Scope per `ZANETA_DECISION` (Option 2) on Issue #66.

## Manifest
`qa/t7-image-manifest.json` is the deterministic T7 contract. Every path is verbatim from preserved evidence (nothing invented, renamed or substituted):
- **6 alliance images** (`/wp-content/uploads/2022/05/…-Nitro-by-Bona-Fide.png`): doc 07 "Six Alliance image URLs safely resolved", doc 03 §4d.
- **10 ranking images** identifiable from evidence (the three added after review are doc 02 rows 59, 62 and 68: `What-is-nitro-Coffee-Explained-simple-Bona-Fide.jpg`, `Bona-Fide-Ai-Created-Image-.jpg`, `Nitro-Coffeee-serving-from-tap-Bona-Fide.jpg`): the five named in master plan §9.3 (`Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap.jpg` 2021/10, `Bona-Fide-Cold-Dispenser-countertop-small-min-1.png`, `All-about-nitro-cold-brew-coffee.jpg`, `Hair-Raiser-Nitro-Coffee-for-website.png`, `Kegerator-counter-top-Bona-Fide.jpg`) plus the two 2023/03 `Nitro-Coffee-Explain-Graphic-*` paths in doc 02.
- `rankingList.complete: false` with an explicit `evidenceGap`: the master plan says ~20 image URLs rank and names the 2023 set by wildcard; the rest is not in preserved evidence and is not inferred.

## T7 gate (`qa/checks.mjs`)
- `required-image-missing` (migration-remaining: reported in foundation, **blocking in strict**) — binary not in `dist/` at the exact path.
- `required-image-invalid` (invariant) — empty file or bytes that are not a real PNG/JPEG matching the extension (e.g. an HTML error page).
- `required-image-path-case` (invariant) — file exists only at a differently-cased path.
- `alliance-count` (invariant) — manifest lists other than 6 alliance images (cannot be silently shrunk); `manifest-undeclared`, `manifest-entry-invalid`, `manifest-duplicate` (invariants).
- `ranking-list-incomplete` (migration-remaining) — until the full list is evidenced and `complete` is set; `complete: true` alone does not clear it — the manifest must also list the pinned evidenced total (21 ranking images: the 10 exact paths plus the 11 summarised URLs in doc 02).
The existing "every referenced `/wp-content/uploads/` path exists" rule is unchanged. No strict check was weakened.

## Not done (deliberately)
- No binaries added: none exist in the repository (`public/` is empty). All 16 manifested images are reported missing.
- Section D (13 `products.yaml` product images) is out of scope. No product/page/ProductCard change.

## Verification
`npm run build`, `check:dist`, `check:htaccess` OK; `npm test` 326 tests, 0 fail (new `tests/foundation/block24-t7-manifest.test.mjs` + 11 QA negative tests); Python isolation 303 OK; foundation QA PASS (0 invariants; T7: 16 `required-image-missing`, 1 `ranking-list-incomplete`); strict QA FAILS (56 blocking), as expected.

## Still open — Stage 8 remains INCOMPLETE
Supply the 16 binaries at the exact manifested paths and the full ranking-image list (Search Console image export or `wp-content/uploads` listing); all other blockers in docs 19/20 are unchanged.
