# Block 46 — Offline uploads-archive inventory tool (Issue #109)

Repository-only. No WordPress, hosting, DNS, redirect, Search Console, deployment or Stage 9 action. No QA rule, threshold, page, scaffold or commerce change. The 40 Stage-8 strict blockers are **unchanged** (`npm run qa:strict`: 40 blocking).

## What it is
`scripts/inventory_uploads_zip.py` — Python 3 stdlib only. It reads only the ZIP central directory of an offline `wp-content/uploads` archive. It never extracts, decompresses, previews or executes a member (PHP included), never follows symlinks, uses no network or credentials, and never copies the ZIP. The owner's archive is **not** available in Claude cloud and was **not** run here; tests use synthetic ZIPs.

## Command for an authorized operator
Run on the machine that already holds the private ZIP. Write the report outside the repo (the tool refuses `public/`):

```
python3 scripts/inventory_uploads_zip.py --archive /path/to/uploads.zip --output ~/uploads-inventory.json
```
Options: `--manifest` (default `qa/t7-image-manifest.json`), `--max-entries` (default 2,000,000). Exit 0 on success, 2 with a clear `error:` on corrupt/missing ZIP, too many entries, or refused output path. Printed summary is capped at 60 lines; the full detail is in the JSON.

## Report contents
Entry/file counts, bytes, per-extension counts, nested prefixes (e.g. `site/wp-content/uploads`), per-file `path`, `uploadsRelative`, `ext`, `size`, `isImage`, and flags: `duplicate-name`, `path-traversal`, `absolute-path`, `backslash-separator`, `nul-byte`, `symlink`, `encrypted`, `php-file`.

## Match semantics
- `exact-manifest-path`: the uploads-relative path equals a `qa/t7-image-manifest.json` path (case-sensitive). Unsafe-path entries are never matched.
- `filename-candidate`: same filename stem after removing WordPress `-WxH`/`-scaled` suffixes. Not exact.
- `family-candidate` (facilities 2–8, keg imagery, kegerator assets, ranking-image family): keyword hit in the path. Not exact.

A match proves neither the original WordPress URL, the alt text, nor that an archive filename equals an SEO-ranked URL. Any later import needs explicit inspection of the matched binaries and evidenced placement in its own Block.

## Tests
`python3 -m unittest tests.isolation.test_inventory_uploads_zip` (14 tests: normal, nested prefix, exact vs candidate, case mismatch, duplicate/unsafe/symlink, empty, invalid/missing, entry cap, no member read/extract, CLI).
