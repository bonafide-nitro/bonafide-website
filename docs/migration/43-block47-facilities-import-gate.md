# Block 47 — Verified facilities image import gate

Source: owner-supplied `uploads.zip`, copied into the review package `bona_fide_block47_about_assets_ready.zip` (not committed). Its eight JPEGs were checked locally against the original ZIP; each exact file matches its byte size and SHA-256 in `scripts/import_block47_facilities.py`.

**What the importer does:** reads *only* the eight known ZIP members, verifies byte counts, SHA-256 and JPEG markers, and writes only to their preserved `public/wp-content/uploads/2022/04/Bona-Fide-Facilities-{1..8}.jpg` paths. It rejects mismatching existing files and symlink destinations, does not run ZIP executables, and never reads credentials or contacts the network.

Use on a trusted machine with the private review ZIP outside this repository:

```sh
python3 scripts/import_block47_facilities.py --archive /private/path/bona_fide_block47_about_assets_ready.zip --dry-run
python3 scripts/import_block47_facilities.py --archive /private/path/bona_fide_block47_about_assets_ready.zip
git add public/wp-content/uploads/2022/04/Bona-Fide-Facilities-{1..8}.jpg
```

**Status:** 8 source binaries exist in the conversation's private review ZIP; they are NOT yet contained in this GitHub branch because the connected GitHub editor accepts text but cannot transmit the binary review package from the ChatGPT container. Do not merge and claim the image assets are shipped until the eight binaries are committed and their checksums verified by CI. Do not ask Claude cloud to pull the local ZIP; that environment cannot see it.

**About-page rendering remains blocked:** preserved evidence supports a facilities gallery of eight images, but does not establish the exact historical sequence, which 2022 JPGs versus older PNGs appeared, nor original alt strings. Do not alter `src/pages/about/index.astro`, mark this scaffold cleared, invent alt, or weaken QA based only on archive filenames.

**Go/no-go:** after import, inspect all eight files and verify against source capture before adding the gallery in a separate block. The current strict QA baseline remains **40** (Block 45). No WordPress, cPanel, DNS, staging or production actions.
