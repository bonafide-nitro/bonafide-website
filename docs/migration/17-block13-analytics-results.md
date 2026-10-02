# Block 13 — Clean analytics/tagging layer (Issue #44, Stage 7)

Repository-only. No GTM/Meta/Klaviyo ID chosen, recovered or scraped; no provider-account change, no secret, no deployment, no live analytics verification, no WordPress/DNS/GSC/hosting action.

## Implemented
- `src/lib/gtm.mjs` — `resolveGtmId`: accepts only `^GTM-[A-Z0-9]{4,12}$` (trimmed); anything else → `null`.
- `src/components/GoogleTagManager.astro` — standard minimal GTM bootstrap (loader `<script>` for `position="head"`, `<noscript><iframe>` for `position="body"`), written fresh; no old WordPress snippet reused. Emits nothing when the ID is unset/invalid.
- `src/layouts/Base.astro` — renders the component once in `<head>` and once as the first element of `<body>`, site-wide; not duplicated per page. The ID comes only from the public build-time variable `PUBLIC_GTM_ID`.
- No custom events, ecommerce payloads, consent-mode assumptions or vendor tags. SEO metadata, URLs, redirects, forms, Calendly, commerce links and legal placeholders are untouched.

## Activation (human-gated, not done here)
`PUBLIC_GTM_ID=GTM-XXXXXXX npm run build`. A GTM container ID is public configuration, not a secret. The verified ID must come from Žaneta/the GTM account owner; consent/cookie handling is a separate decision.

## Integration remaining
- **GTM:** verified container ID outstanding.
- **Meta Pixel / Klaviyo:** deliberately NOT added. Stage-1 evidence says they were legitimate Head & Footer Code items, but no verified IDs/config are retained. Pending a verified-configuration/retention decision; when decided, prefer managing them inside GTM to avoid duplicate direct tags.
- GA4, consent manager, cookie banner, event/conversion tracking: out of scope.

## Tests
`tests/foundation/block13-gtm.test.mjs`: resolver (valid/invalid incl. injection attempts); default build has no GTM markup/iframe on any page; GTM wired once via layout, no per-page use, no hard-coded ID, no Meta/Klaviyo/GA/compromised strings; build with dummy `GTM-ABC1234` emits one head loader + first-in-body noscript on every page; build with an invalid value emits nothing.
