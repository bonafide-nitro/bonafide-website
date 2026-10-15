# Block 53 — `/nitro-cold-brew/` original illustrations (Issue #122)

Repository-only. No WordPress, DNS, redirect, Search Console or deployment effect.

## Evidence examined
Docs 02, 04 (§9.3), 09 (images section), 26, 31, 33; `qa/t7-image-manifest.json`; `tests/foundation/block33-t7-assets.test.mjs`; `src/pages/nitro-cold-brew/index.astro`. No saved original `/nitro-cold-brew/` HTML is in the repository.

## Provenance matrix
| Image (`/wp-content/uploads/...`) | Binary pinned (size, SHA-256) | Page association | Rendered |
| --- | --- | --- | --- |
| `2018/06/All-about-nitro-cold-brew-coffee.jpg` | yes, Block 33 (188946) | doc 09 names it for `/nitro-cold-brew/` | yes (1920x1188) |
| `2021/10/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap.jpg` | yes, Block 33 (145686) | doc 09 lists it for `/nitro-cold-brew/` (via master-plan ranking list) | yes (1500x1000) |
| `2023/03/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-1.jpg` | yes, Block 33 (237416) | doc 09 lists the 2023 `Nitro-Coffee-Explain-Graphic-*` set for this page | yes (1500x1000) |
| `2023/03/Nitro-Coffee-Explain-Graphic-Bona-Fide-Keg-Tap-PET-Keg.jpg` | yes, Block 33 (274186) | same | yes (1500x1000) |
| `2018/06/Kegerator-counter-top-Bona-Fide.jpg` | yes, Block 33 (212930) | doc 09 lists it for this page and for `/kegerators/` | yes (1920x1188) |
| `2018/06/Bona-Fide-Cold-Dispenser-countertop-small-min-1.png` | yes, Block 33 (86246) | same | yes (591x768) |
| `2018/06/Cold-brew-Nitro-Coffee.jpg` | **no binary in the repo** | doc 09 | **no, not referenced, no replacement invented** |

## Rendering (provisional, neutral)
Six images in one collection after the intro paragraph: `alt=""` on all (new accessibility handling, not recovered history), no captions, no equipment-group mapping, arbitrary order that claims no historical sequence or position. Width/height are the committed binaries' dimensions; `max-width:100%;height:auto`, lazy. Block 49 renders and the 2018/2021/2023 files' other pages are untouched.

## Historical uncertainties
- Association of the five non-"All-about" files with this page rests on doc 09 (itself derived from the master-plan ranking-image list, which is sitewide, not per page). Their actual rendered placement on the original page is not evidenced.
- Exact position, order, original alt text, and fuller copy are not evidenced.
- `Cold-brew-Nitro-Coffee.jpg` and any other page images are unavailable.

## Remaining gate
Scaffold marker and the Stage-8 strict blocker for `/nitro-cold-brew/` are kept; no QA threshold changed. Unlock needs a saved original `/nitro-cold-brew/` HTML (or owner evidence) plus the missing binary.
