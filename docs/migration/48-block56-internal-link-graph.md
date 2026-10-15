# Block 56 — internal link graph check (Issue #128)

`npm run check:links` (`scripts/check-internal-links.mjs`) checks the built `dist/` offline. Every local `<a href>` and resource reference (`img`/`source`/`script` src, `link href` except canonical/alternate/dns-prefetch/preconnect) on the 40 built pages and `404.html` must resolve to a generated `index.html` route or a byte-present file.

- Handled: root-absolute, relative (`../`), same-origin absolute (`bonafidenitro.com`, `www.`), trailing slash, query strings, fragments, HTML-escaped attributes, file/download links.
- Out of scope: outbound hosts, `mailto:`/`tel:`/`javascript:`/`data:`, fragment-only links, canonical and schema URLs. Fragment ids are not verified.
- Extends the T8 check in `qa/checks.mjs`, which skips `/wp-content/uploads/` anchors and checks anchors only. Parsing reuses `qa/lib/html.mjs`; `resourceRefs` was added to its output.
- Wired into `test:build` and `.github/workflows/build-qa.yml` (zero known false positives, no allowlist).

## Findings

Before and after: 774 local references across 41 HTML files all resolve. No genuine broken internal target exists, so no source, route, redirect or link was changed; the deliverable is the regression gate (`tests/foundation/block56-internal-links.test.mjs`). `/products/` and `/products-2/` are untouched.
