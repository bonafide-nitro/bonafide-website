# Block 20 (Issue #58) — Apache redirect artifact and verifier

Repository-only. No production, WordPress/cPanel, DNS, Search Console, credential, hosting, deployment or live redirect action.

## Implemented
- `scripts/build-htaccess.mjs` reads `src/data/redirects.yaml` and writes `deploy/apache/redirects.htaccess` (`npm run build:htaccess`;
  `npm run check:htaccess` fails if the committed file is missing or stale). Output is a pure function of the register and `site.yaml`:
  no timestamps, stable order, so regeneration is byte-stable.
- The artifact holds exactly the 32 `defined` rules as `mod_rewrite` `[R=301,L]` rules. The 26 `pending-decision` rules are never emitted.
  The generator throws on a non-301 status, a duplicate source, a protected 200 URL used as a source, or an unsupported rule shape.
- Match order: query-conditioned AMP/BookingPress rule, then exact rules (including the three booking AMP overrides, which therefore beat the generic
  AMP pattern), then the generic `/<slug>/amp/` rule, then protocol/host canonicalisation last.
- Path-rule destinations are absolute `https://bonafidenitro.com/...` and carry no host condition, so a request on `http://` or `www.` is still
  **one** hop rather than canonicalisation followed by the path rule. The register's `to` paths are unchanged.
- External `nitrocoffee.store` destinations are percent-encoded ASCII (`®` → `%C2%AE`) with `NE`, and drop the source query (`QSD`).
  Internal exact rules keep Apache's default of carrying the request query string through.
- `deploy/apache/` is a deploy-artifact location only. It is not under `public/`, so it is not copied into `dist/` and nothing is wired into the Astro build.
  The later deployment Block decides how the file is placed in `/public_html`; hand-editing the server `.htaccess` stays forbidden (master plan §10.4).
- `tests/foundation/block20-htaccess.test.mjs` re-parses the artifact with an independent mini-interpreter and checks: rule count equals `defined` (32); no pending
  source or id emitted; each rule's source, destination and status against the register; 301 only; no duplicates, loops or chains (including from `http://`/`www.`
  forms and the AMP overrides); no protected URL (incl. `/products/` and `/products-2/`) is a source; byte-identical regeneration. Existing T2 QA invariants are unchanged.

## Staging verification procedure (NOT performed; later Block, needs separate approval)
On a locked staging target on the production host, with the artifact installed there only, for each `defined` rule run without following redirects:

    curl -sI --resolve bonafidenitro.com:443:<STAGING_IP> "https://bonafidenitro.com<source-path>" | grep -iE '^(HTTP|location)'

Expect `301` and a `Location` equal to the register destination (destinations are production URLs; do **not** follow them), then confirm the `Location`
target itself returns `200` (not 3xx) on the staged static build. Also check `http://` and `www.` variants return one 301 to the final URL, the three
booking AMP URLs go straight to `/book-appointment/`, `/products/` and `/products-2/` return 200, and an unknown path returns a real 404. mod_rewrite availability,
`AllowOverride` and non-ASCII handling on the host are unverified until this runs.

## Still open (unchanged)
- 26 `pending-decision` redirects remain an explicit Stage-8 blocker; no destination was invented.
- Production-host staging verification of the artifact remains a launch blocker.
- **Stage 8 remains incomplete.** Only the "artifact generation" part of the doc 19 §2 redirect blocker is resolved. This does not authorize deployment, cutover or Stage 9.
