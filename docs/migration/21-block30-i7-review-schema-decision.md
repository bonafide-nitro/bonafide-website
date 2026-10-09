# Block 30 — I7 / D7 homepage Review/rating schema decision (Issue #78)

Repository-only evidence review. No WordPress, DNS, Search Console, hosting, credential, staging, deployment or live action.

## Evidence inspected
- Master plan (doc 04) I7/D7, SEO-5, §schema module: reproduce homepage review/rating markup **only if verified legitimate**; do not reproduce self-serving review markup; if it is the site's own rating, drop it and document the loss of one rich result.
- SEO baseline (doc 01) and raw appendix (doc 02): Search Console reported exactly one valid Review snippet, on `/`, item name "Bona Fide Nitro Coffee and Tea", last detected 2026-09-18.
- Source capture (docs 07/08): lists a "customer testimonial section" on `/` but records that its body text is not in the capture.
- `src/pages/index.astro`, `src/layouts/Base.astro`, docs 19/20, `docs/MIGRATION_QA.md`.

## Finding
The repository proves only that Google detected a Review snippet. It records **no** generating component, **no** review count, rating value, reviewer identity, review source or URL, and no third-party review provider. Third-party provenance is therefore **not evidenced**, and the markup cannot be shown to be anything other than site-authored/unverifiable.

## Decision (Issue #78 safe default)
- Review / AggregateRating / Rating schema is **omitted at launch**. Nothing was invented.
- **Expected loss:** the one historical Review rich result on `/` (the domain's only rich result) is expected to disappear. This is deliberate and accepted under master plan I7/D7.
- If legitimate third-party review data is later evidenced, a separate Block may add exactly the evidenced fields.

## Changes
- `qa/checks.mjs`: new T6 invariant `T6:unsupported-review-schema` — fails in foundation and strict mode if any page's JSON-LD contains a Review/AggregateRating/Rating `@type` or review/rating properties.
- `tests/qa/qa.test.mjs`: two detection tests. `tests/foundation/block30-review-schema.test.mjs`: built homepage and all built pages contain no review/rating schema; homepage title/H1/canonical unchanged.
- `src/pages/index.astro`: scaffold comment updated only. Title, H1, canonical, navigation and content are unchanged.
- Docs: this note; Stage-8 accounting in docs 19, 20 and `MIGRATION_QA.md`.

## Remaining homepage content blocker (recorded separately)
The visible **customer-testimonial section** on `/` is not preserved: its body text is not in the capture and is not invented. The `/` scaffold marker therefore **remains**, now for this reason rather than for I7. Resolving it needs the real testimonial text/source from Žaneta or an authorised capture.

## Stage 8
I7 is resolved (omit). Stage 8 remains **incomplete** because of the independent blockers in docs 19 §2 and 20 §8/§11. Stage 9 is not started.

## Verification
`npm run build`, `npm run check:dist`, `npm test` (260/260), Python isolation (303/303), `npm run qa:foundation` (PASS, 0 invariants, 45 migration-remaining). `npm run check:htaccess` does not exist in this repository's `package.json` (no such script), so it could not be run.
