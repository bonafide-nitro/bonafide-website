# Block 33 (Issue #84) — Import of the 16 recovered original T7 assets

Repository-only. No production, WordPress/cPanel, GoDaddy, DNS, hosting, credential, staging, deployment, Stage 9 or live-site change.

## Source and validation
The owner supplied a private, filtered T7-only ZIP (`bona_fide_t7_recovered_assets.zip`, original `wp-content/uploads/...` paths plus `RECOVERY_MANIFEST.json`) extracted from the private WordPress uploads archive. The ZIP is **not** committed; only the 16 images are. It was extracted into an isolated scratch directory and nothing in it was executed. Validation before import:
- The ZIP held exactly 16 files, equal to the 16 paths in `qa/t7-image-manifest.json` (6 alliance + 10 ranking), with no extras, no path traversal and no non-image files.
- Each file's size and SHA-256 match `RECOVERY_MANIFEST.json`, and each has the correct PNG or JPEG signature.
- No filename was changed, invented or substituted, and no alt text was created.

## Import
The 16 files were copied byte-for-byte to `public/wp-content/uploads/<year>/<month>/<original filename>` (the existing build copies `public/` to `dist/` at the same path). `tests/foundation/block33-t7-assets.test.mjs` pins path, size and SHA-256 for all 16 and checks:
- the exact-case path in `public/` and `dist/`;
- the PNG/JPEG signature;
- that `dist/` is byte-identical to `public/`;
- that no image other than the 16 manifested ones exists under `public/wp-content/uploads`;
- that `rankingList.complete` is still `false`.

## QA accounting
| | before (base f95fe55) | after |
| --- | --- | --- |
| T7 `required-image-missing` | 16 | 0 |
| T7 `ranking-list-incomplete` | 1 | 1 (unchanged) |
| strict blocking findings | 58 | 42 |
| invariant findings | 0 | 0 |

The 16 images pass the existing T7 decoder gate (full decode, no trailing bytes) and the upload-path preservation rule.

## Deliberately not done
- `rankingList.complete` is **not** set true and `qa/t7-image-manifest.json` is unchanged. The archive does not independently prove the full ranking-image list (master plan §9.3: ~20 ranking URLs; doc 02 rows 72–82 are summarised without exact paths). This finding stays open until the full list is evidenced, for example by a Search Console image export.
- No other uploads from the archive were imported, and no pages, alt text or product-image changes were made (13 `products.yaml` product images are out of scope).

## Still open
The 42 remaining strict findings are unrelated to this Block: scaffold placeholders, the T5 store-link minimums and `ranking-list-incomplete`. Stage 8 remains incomplete.
