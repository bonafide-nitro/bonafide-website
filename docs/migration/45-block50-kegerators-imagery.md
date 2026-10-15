# Block 50 — `/kegerators/` equipment imagery (Issue #116)

## Evidence map
- Both files are already imported and SHA-256 pinned (`tests/foundation/block33-t7-assets.test.mjs`, `qa/t7-image-manifest.json`): `Kegerator-counter-top-Bona-Fide.jpg` (1920x1188) and `Bona-Fide-Cold-Dispenser-countertop-small-min-1.png` (591x768), both in `/wp-content/uploads/2018/06/`.
- Doc 09 associates both filenames with `/kegerators/`; docs 02/04 record them as ranking images. **No preserved record gives their position, caption, alt text, or which of the four equipment groups they depict.**

## Rendered (smallest safe partial)
- Both images in one neutral block after the intro, not under any group heading, in no claimed historical order.
- `alt=""` on both: this is **new accessibility handling** (decorative), not recovered historical alt. No descriptive alt is invented.

## Not done
- The three 2019/2022 machine images in doc 08 have no pinned binaries and are not referenced.
- Scaffold marker and the Stage-8 strict blocker are kept; no QA threshold changed. `qa/qa.config.json` blocker text is unchanged (config out of scope).
- Other five Block-5 routes keep the no-`<img>` rule; Block 49 renders not placed.
