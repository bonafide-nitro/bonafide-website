# Block 26 (Issue #70) — preserve indexed offices-coffee PDF (Stage-8 blocker I3)

Repository-only. No production, WordPress/cPanel, DNS, Search Console, hosting, credential, staging, deployment, redirect or live-site change. Scope per Issue #70 and its `ZANETA_DECISION` comments.

## Retrieval
Claude Cloud could not fetch the PDF from `bonafidenitro.com` or the GitHub attachment (egress/403). Per `ZANETA_DECISION`, the operator-supplied original was committed on branch `block26-pdf-upload`; that exact file was brought into this Block's branch unmodified.

## Change
- Added `public/wp-content/uploads/2021/09/17x11-Bona-FIde-coffee-for-Offices-version-10-Email_compressed.pdf` (filename and case preserved). Not modified, regenerated, recompressed, OCR'd or substituted.
- Identity verified before commit: 956136 bytes; SHA-256 `4b74753d978844d00b7d4c7a38c8dc0cc3d38bece2d2fa12b6753c5eafd47f9b`; Git blob `68bf3c29ed209a82474369dbb57da99330dc4e19` (matches the operator-supplied original).
- QA: `tests/foundation/block26-indexed-pdf.test.mjs` asserts the PDF exists at the exact case-sensitive path in `public/` and `dist/`, is non-empty, starts with `%PDF-`, ends with `%%EOF`, is not HTML/error content, is byte-identical to the pinned size/SHA-256 and to its `public/` source, and is not referenced by `src/data/redirects.yaml` or `deploy/`.
- No redirect was added for this path (the exact PDF is preserved).

## Stage-8 accounting
I3 (`docs/migration/19-stage8-prelaunch-comparison.md`) is resolved by preservation at the exact path; it no longer needs a preserve-or-redirect decision. Docs 19/20 are preserved evidence and are not edited. The PDF is not a page marker or strict-QA contract, so strict QA's finding count is unchanged (58).

## Verification
`npm run build`, `check:dist`, `check:htaccess` OK; `npm test` 355 pass, 0 fail; Python isolation OK; foundation QA PASS; strict QA FAILS with 58 migration-remaining findings (unchanged).

## Still open — Stage 8 remains INCOMPLETE
I2 marketing-plan PDF, missing T7 images, commerce inventory, placeholder pages, pending-decision redirects, staging and all other blockers in docs 19/20/26 are unchanged.
