# Block 47 — Verified facilities image import gate

Source: owner-supplied `uploads.zip`, copied into the review package `bona_fide_block47_about_assets_ready.zip` (not committed). Its eight JPEGs were checked locally against the original ZIP; each exact file matches its byte size and SHA-256 in `scripts/import_block47_facilities.py`.

**What the importer does:** reads *only* the eight known ZIP members, verifies byte counts, SHA-256 and JPEG markers, and writes only to their preserved `public/wp-content/uploads/2022/04/Bona-Fide-Facilities-{1..8}.jpg` paths. It rejects mismatching existing files and symlink destinations, does not run ZIP executables, and never reads credentials or contacts the network.

Use on a trusted machine with the private review ZIP outside this repository:

```sh
python3 scripts/import_block47_facilities.py --archive /private/path/bona_fide_block47_about_assets_ready.zip --dry-run
python3 scripts/import_block47_facilities.py --archive /private/path/bona_fide_block47_about_assets_ready.zip
git add public/wp-content/uploads/2022/04/Bona-Fide-Facilities-{1..8}.jpg
```

**Status (updated Block 48):** all eight verified JPEG binaries were merged to `main` in #111 at `public/wp-content/uploads/2022/04/Bona-Fide-Facilities-{1..8}.jpg`; they are no longer absent. Their size and SHA-256 are pinned in `tests/foundation/block47-assets.mjs` and checked by `block33-t7-assets.test.mjs` (including byte-identical copy to `dist/`).

**About-page rendering remains blocked:** preserved evidence supports a facilities gallery of eight images, but does not establish the exact historical sequence, which 2022 JPGs versus older PNGs appeared, nor original alt strings. Do not mark this scaffold cleared, invent alt, or weaken QA based only on archive filenames.

**Go/no-go:** the import is done; the gallery remains blocked on evidence (see Block 48 below). The current strict QA baseline remains **40** (Block 45). No WordPress, cPanel, DNS, staging or production actions.

## Block 48 — evidence map and decision (#112)

Repo evidence searched: `src/pages/about/index.astro`, docs 01–04, 07–09, 31, 37, 43, saved captures, QA config and tests. Result:

| Question | Evidence in repo | Status |
| --- | --- | --- |
| Eight facilities JPG binaries exist at exact 2022/04 paths | size + SHA-256 pinned and tested | verified |
| `Bona-Fide-Facilities-1.jpg` was on `/about/` | doc 09 | evidenced |
| Images 2–8 were on `/about/` | filenames only (Block 47 ZIP); no historical HTML | not independently evidenced |
| Gallery order | none | unresolved |
| JPG vs older PNG variants displayed | none | unresolved |
| Original alt text | none (doc 37 covers product images only) | unresolved |

**Decision:** `/about/` is left unchanged — no `<img>`, scaffold kept. A numeric-order gallery with neutral alt would assert an unevidenced order and alt semantics, and the repo preservation policy forbids inventing either. The 40 strict QA blockers are unchanged; the `/about/` finding text now states the precise remaining gap.

**Needed to unblock (owner/Santiago):** a saved historical `/about/` HTML capture (or Wayback copy) showing gallery order, displayed variants and alt attributes; or an explicit Žaneta decision approving a provisional numeric-order gallery with empty/neutral alt.
