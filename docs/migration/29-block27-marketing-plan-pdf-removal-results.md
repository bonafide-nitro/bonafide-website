# Block 27 (Issue #72) — deliberate removal of the 2026 marketing-plan PDF (Stage-8 blocker I2)

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment, redirect or live-site change. Scope per Issue #72 and its revised `ZANETA_DECISION` comment (supersedes the original "preserve the exact path" scope).

## Decision
`/wp-content/uploads/2026/02/Bona-Fide-Marketing-Plan-2026.pdf` is **intentionally removed** from the migrated static site. The document is no longer needed.
- The PDF is not added to the repository or the static build.
- No replacement PDF is created.
- The URL is not redirected to another page.
- The historical URL is treated as intentionally removed (it will not resolve on the static site).

## Change
- QA: `tests/foundation/block27-removed-pdf.test.mjs` asserts the PDF (matched case-insensitively) is absent from `public/` and `dist/`, that no file under `public/wp-content/uploads/2026/02/` looks like a renamed copy, and that `src/data/redirects.yaml` and `deploy/` neither redirect nor reference the path.
- No source, redirect, or deploy-config change was needed.

## Stage-8 accounting
I2 (`docs/migration/19-stage8-prelaunch-comparison.md`, master plan §7.7) is resolved by explicit business decision: **deliberate removal**. Docs 19/20 are preserved evidence and are not edited; this note supersedes the I2 "unresolved" entry. The PDF is not a page marker or strict-QA contract, so strict QA's finding count is unchanged.

## Not authorized here — later live / post-cutover SEO action
Search Console removal/deindex handling for this URL, if needed, is a later live/post-cutover action and is **not** authorized or performed in this Block.

## Still open — Stage 8 remains INCOMPLETE
Missing T7 images, commerce inventory, placeholder pages, pending-decision redirects, staging and all other blockers in docs 19/20/26 are unchanged.
