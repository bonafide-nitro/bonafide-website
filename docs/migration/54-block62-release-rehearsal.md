# Block 62 (Issue #141) — Offline release-zip rehearsal

Repository-only. No live WordPress, staging, cPanel/SSH, DNS, SSL, hosting or network access; no host directive, route or content change.

## Gap found
`check:artifact` and `package:preview` inspect `dist/` *before* zipping, and Block 59 validates Apache files. Nothing inspected the **zip that would be handed over**: its entry names, entry types, layout, extracted bytes, or whether it still equals the built `dist/`.

## What was added
`scripts/rehearse-release.mjs` (`npm run rehearse:release`, run in the existing `preview-package.yml` job after `package:preview`). Node stdlib only (the existing `unzip` binary extracts, only into an isolated temp dir and only after the entry list is judged safe). Prints `PASS` or `BLOCKED` plus the failing invariant ids:

| Id | Invariant |
| --- | --- |
| R1 | zip is readable (no zip64/multi-disk guesses) and non-empty |
| R2 | no absolute, `..`, `.`, backslash, drive-letter, control-char, empty-segment or duplicate entry names |
| R3 | no symlink or special-file entries |
| R4 | single `bonafide-preview/` root; only `site/` plus the three preview files; `index.html`, `404.html`, `robots.txt`, `sitemap.xml` present |
| R5 | extracted `site/` passes the existing release-artifact scan (no PHP, `.htaccess`, WordPress runtime, obfuscation, forbidden strings) |
| R6 | no staging/preview markers in production content (`X-Robots-Tag`, auth directives, `.htpasswd`, `@@…@@` placeholders), no home-page `noindex`, no blanket `Disallow: /` |
| R7 | every `deploy/apache/redirects.htaccess` destination exists in the package |
| R8 | recorded `PREVIEW-INFO.json` tree hash/count and (when `dist/` exists) the built `dist/` match the extracted `site/` byte-for-byte |

On PASS it prints the offline copy plan: copy the contents of `bonafide-preview/site/` only; never `Open-Preview.command`, `READ-ME-FIRST.txt`, `PREVIEW-INFO.json`. Nothing is copied or executed. WordPress remains the untouched rollback.

Tests: `tests/foundation/block62-release-rehearsal.test.mjs` (hand-built hostile zips are rejected; the real packaged zip is accepted). PASS here does not prove host behaviour, a clean WordPress rollback copy, or QA clearance; `qa:strict` is unchanged.
