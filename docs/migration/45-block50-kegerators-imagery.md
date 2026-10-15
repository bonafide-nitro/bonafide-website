# Block 50 — `/kegerators/` equipment imagery (Issue #116)

## Evidence map
- Both files are already imported and SHA-256 pinned (`tests/foundation/block33-t7-assets.test.mjs`, `qa/t7-image-manifest.json`): `Kegerator-counter-top-Bona-Fide.jpg` (1920x1188) and `Bona-Fide-Cold-Dispenser-countertop-small-min-1.png` (591x768), both in `/wp-content/uploads/2018/06/`.
- Doc 09 associates both filenames with `/kegerators/`; docs 02/04 record them as ranking images. **No preserved record gives their position, caption, alt text, or which of the four equipment groups they depict.**

## Rendered (smallest safe partial)
- Both images in one neutral block after the intro, not under any group heading, in no claimed historical order.
- `alt=""` on both: this is **new accessibility handling** (decorative), not recovered historical alt. No descriptive alt is invented.

## Not done
- The three 2019/2022 machine images in doc 08 are not referenced. *Correction (Block 51, Issue #118): the original wording here said they have no pinned binaries; that was wrong. All three binaries are committed and SHA-256 pinned since Block 40. They remain unrendered because their exact /kegerators/ position, order and alt text are not evidenced (doc 09 records only the page association); see the Block 51 section below.*
- Scaffold marker and the Stage-8 strict blocker are kept; no QA threshold changed. `qa/qa.config.json` blocker text was left unchanged in Block 50 and reconciled in Block 51.
- Other five Block-5 routes keep the no-`<img>` rule; Block 49 renders not placed.

## Block 51 reconciliation (Issue #118)
Repository-only. Correction of a false statement; no render change.

**Binaries:** all three equipment PNGs are committed and pinned (size + SHA-256) in `tests/foundation/block40-assets.mjs` (doc 39). The scaffold comment, this doc and the `qa/qa.config.json` blocker string wrongly said they lacked binaries; all three are corrected. The page association with `/kegerators/` is recorded in doc 09; the exact position, order, original alt and fuller copy remain **unverified**.

**Sources examined:** docs 07, 08, 09, 39, 41 and the Block 40/50 tests. The only placement evidence is the saved original `/products/` HTML (doc 39). Doc 07 lists the images under "Retail products — /products/"; doc 08 records exact paths as equipment images with no `/kegerators/` position; doc 09 (line 23) associates the three "recorded in doc 08" with `/kegerators/` as still to be supplied, without order or alt. No saved `/kegerators/` HTML is in the repository. The page association is therefore recorded, but exact position, order and alt are not, so none of the three is rendered on `/kegerators/`.

### Provenance matrix
| Image (`/wp-content/uploads/...`) | Binary pinned | `/products/` placement (original alt) | `/kegerators/` association | Rendered on `/kegerators/` |
| --- | --- | --- | --- | --- |
| `2019/08/Bona-Fide-Cold-doble-tap-nitro-machine-compressed.png` | yes, Block 40 | confirmed: under "Are You Looking For Dispensing Equipment?" (doc 39) | associated with `/kegerators/` (doc 09); exact position, order and alt unconfirmed | no |
| `2019/05/NEW-Hot-Tap-Bona-Fide-Nitro-Coffee-and-tea-for-website-compressed.png` | yes, Block 40 | confirmed: same section (doc 39) | associated with `/kegerators/` (doc 09); exact position, order and alt unconfirmed | no |
| `2022/10/Bona-Fide-Keg-BIK-Set-Hot-Cold-Machine-New.png` | yes, Block 40 | confirmed: after the "Coffee & Tea For Office" paragraph (doc 39) | associated with `/kegerators/` (doc 09); exact position, order and alt unconfirmed | no |
| `2018/06/Kegerator-counter-top-Bona-Fide.jpg` | yes, Block 33 | n/a | associated with `/kegerators/` (doc 09), position unknown | yes (Block 50, `alt=""`) |
| `2018/06/Bona-Fide-Cold-Dispenser-countertop-small-min-1.png` | yes, Block 33 | n/a | associated with `/kegerators/` (doc 09), position unknown | yes (Block 50, `alt=""`) |

**To unlock:** a saved original `/kegerators/` HTML (or equivalent owner evidence) showing the exact position, order and alt text of the already-associated images (page association is not in question; doc 09 records it). No alt text is invented. Scaffold marker and strict QA thresholds are unchanged; Stage-8 strict blockers stand.
