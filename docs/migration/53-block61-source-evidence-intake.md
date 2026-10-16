# Block 61 — Source-evidence search outcome and offline intake tool (Issue #139)

Repository-only. No WordPress, hosting, DNS, redirect, Search Console, deployment or scraping. No page, scaffold flag, QA rule/threshold, commerce or redirect change. Base `5832902`.

## Search outcome (no recoverable page-level gap)
Searched tracked files, all 125 commits of Git history (no deleted evidence files), `docs/migration/*` (incl. issue #83 and Blocks 28/29/32/40/45/57 results) and `qa/qa.config.json`. The repository contains no original page copy, meta descriptions, distributor/CTA/Calendly/store URLs, or alt text beyond what is already migrated. Ranking-image presence was not treated as page placement. This confirms Block 45 (doc 41): every one of the 40 strict findings still needs external historical files or a human decision. Nothing was guessed, so none of `/howtobuy/`, `/about/`, contact, `/products/`, `/products-2/`, blog listing or scaffold pages changed.

## Intake tool
`scripts/intake-source-evidence.mjs` (Node stdlib + `qa/lib/html.mjs`; `npm run intake:source -- <args>`). Offline, read-only input; makes no network request; reads nothing but the supplied file, `src/pages` (route list), `public/` (existing-binary compare) and `qa/t7-image-manifest.json`.

```
npm run intake:source -- --route /howtobuy/ --html ~/saved/howtobuy.html --output ~/howtobuy-intake.json
npm run intake:source -- --path /wp-content/uploads/2022/04/X.jpg --asset ~/saved/X.jpg
```
Exit 0 on success; exit 2 with `error:` for a symlink or non-regular input, input over 20 MiB, binary data passed as HTML, unknown arguments, traversal in `--path`, or a report path inside `src/`, `public/`, `qa/` or `docs/`. Without `--output` the JSON goes to stdout.

**HTML report:** route known in `src/pages`; route association (`match` / `mismatch` / `none` from canonical and `og:url` — `/products/` and `/products-2/` are distinct); title; meta description(s); h1/headings; links with class (`internal`, `external`, `relative`, `unsafe-scheme`…) and external host counts; images with `src`, path and whether `alt` is present (absent alt is flagged, never treated as empty alt); forms; script/iframe **counts only**; up to 40 truncated text snippets. Flags: `route-unknown`, `route-mismatch`, `route-unverified`, `no-meta-description`, `unsafe-link-scheme`, `scripts-present`, `iframes-present`, `images-without-alt-attribute`, etc.

**Asset report:** size, SHA-256, magic-byte type vs extension, whether the path is in the T7 manifest, and whether `public/` holds an identical, different or no file at that path.

**Safety:** raw markup and script bodies are never placed in the report; nothing is written to pages; the report is for human review only. A report proves neither provenance nor placement, and any later import needs its own Block.

## Tests
`tests/foundation/block61-source-intake.test.mjs` (14 tests, run by `npm test`).
