# Block 12 — Calendly booking page integration (Issue #42, Stage 7)

Repository-only. No Calendly URL chosen or invented, no provider-account change, no secret, no deployment, no `.htaccess`, no production/WordPress/DNS/GSC action, no live booking test.

## Implemented
- `/book-appointment/` is a real static Astro route (trailing slash, `format: 'directory'`): H1 "Book an Appointment", one neutral sentence of copy, self-canonical, Organization/WebSite/WebPage/BreadcrumbList schema.
- **Index/sitemap contract:** `noindex`, excluded from the sitemap. Booking is a transactional utility URL ("not indexing them is fine", baseline line 355) and the master plan's sitemap rule excludes booking URLs. The existing `plannedPages` entry in `src/data/seo-baseline.json` now records this (`canonical: self`, `indexable: false`, `inSitemap: false`); it is deliberately not a protected `urls` entry. The page keeps the scaffold marker until the Calendly value is configured.
- **Calendly destination** comes only from the public build-time variable `PUBLIC_CALENDLY_URL`, read in `src/lib/calendly.mjs` (`resolveCalendlyUrl`). It is accepted only if it is an `https:` URL on `calendly.com` (or a subdomain), has a non-empty path and carries no credentials. The baseline is a plain external link (`rel="noopener noreferrer"`); no iframe, no Calendly script/embed, no cookies/tracking.
- **Unset/invalid value:** the page still builds as a static 200; it shows a non-link, `aria-disabled` "Online scheduling is not available yet" label and a `role="status"` notice pointing to the contact page. No external anchor or Calendly reference is emitted.
- **Redirects:** `src/data/redirects.yaml` is unchanged. New tests prove the five booking sources and the three AMP booking overrides are exact, defined, one-hop 301s to `/book-appointment/`, that `/book-appointment/` is never a redirect source and that no destination is another source (no chain).

## Integration remaining (human-gated)
The exact live Calendly scheduling URL is not in repository evidence. A human must supply it (e.g. `PUBLIC_CALENDLY_URL=https://calendly.com/<account>/<event> npm run build`), then remove the page's scaffold marker. A public scheduling URL is configuration, not a secret; never put an API token in this variable. Calendly embed/tracking scripts are intentionally out of scope.

## Tests
`tests/foundation/block12-booking.test.mjs` (resolver; route/canonical/noindex/H1/schema/no scripts or iframe; unset → disabled with no Calendly reference; no committed URL/secret/script; baseline contract; not in sitemap; five booking redirects; three AMP overrides; no chains). Also verified by building with a dummy `https://calendly.com/example-team/intro` (link emitted) and with an `http://` value (no link emitted).

## Results
`npm run build` OK; `npm run check:dist` clean; `npm test` 237/237; Python isolation suite OK (303); foundation QA PASS, 0 invariants, 45 migration-remaining (the new scaffold-marked `/book-appointment/` is the one added finding); strict still FAIL as before.
